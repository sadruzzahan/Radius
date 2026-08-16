from __future__ import annotations

import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import imagehash
import pandas as pd
import requests
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image
from pydantic import BaseModel, Field
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

BASE=Path(__file__).resolve().parent
DATA=BASE/'data'
PRICE_CSV=DATA/'market_prices_expanded.csv'
FRAUD_CSV=DATA/'fraud_listings_synthetic.csv'
SERPAPI_KEY=os.getenv('SERPAPI_KEY','').strip()
SERPAPI_URL='https://serpapi.com/search.json'
IMAGE_HIGH_MAX=5
IMAGE_MEDIUM_MAX=10
BANNED_TERMS={'whatsapp me','telegram me','pay first','send advance','outside platform only','bkash first','urgent advance'}
PROHIBITED_TERMS={'weapon','gun','nid card','passport for sale','exam paper','bank account for sale'}

class AnalyzeRequest(BaseModel):
    title:str
    description:str
    category:str
    brand:str=''
    condition:str
    price:float=Field(gt=0)
    seller_information:dict[str,Any]=Field(default_factory=dict)
    image_hashes:list[str]=Field(default_factory=list)
    existing_image_hashes:list[str]=Field(default_factory=list)
    existing_descriptions:list[str]=Field(default_factory=list)

app=FastAPI(title='RADIUS Explainable Fraud Service',version='1.1.0')

@app.get('/')
def root()->dict[str,Any]:
    return {'service':'RADIUS Explainable Fraud Service','status':'ok','version':'1.1.0','required_models':['RandomForestRegressor','TF-IDF + MultinomialNB','pHash'],'serpapi_secondary_evidence':bool(SERPAPI_KEY)}

@app.get('/health')
def health()->dict[str,Any]:
    return {'status':'ok','version':'1.1.0','serpapi_configured':bool(SERPAPI_KEY),'random_forest_enabled':True,'tfidf_nb_enabled':True}

@app.post('/hash-image')
async def hash_image(image:UploadFile=File(...))->dict[str,str]:
    if image.content_type and image.content_type not in {'image/jpeg','image/png','image/webp'}: raise HTTPException(400,'Unsupported image type')
    try: digest=imagehash.phash(Image.open(image.file).convert('RGB'))
    except Exception as exc: raise HTTPException(400,'Invalid image') from exc
    return {'image_hash':str(digest)}

def hamming(a:str,b:str)->int:
    try:return (int(a,16)^int(b,16)).bit_count()
    except (TypeError,ValueError):return 999

def image_risk(own:list[str],existing:list[str])->tuple[float,str]:
    if not own or not existing:return 0.0,'No matching historical image was found.'
    nearest=min(hamming(a,b) for a in own for b in existing)
    if nearest<=IMAGE_HIGH_MAX:return 95.0,f'Possible reused/stolen image signal: perceptual hash distance is {nearest}.'
    if nearest<=IMAGE_MEDIUM_MAX:return 60.0,f'Uploaded image is visually similar to an existing listing (hash distance {nearest}).'
    return 5.0,f'No close perceptual-image match; nearest hash distance is {nearest}.'

@lru_cache(maxsize=1)
def price_model()->Pipeline:
    if not PRICE_CSV.exists(): raise FileNotFoundError(f'Price dataset not found: {PRICE_CSV}')
    df=pd.read_csv(PRICE_CSV);required={'category','brand','condition','price'};missing=required-set(df.columns)
    if missing: raise ValueError('Price dataset missing columns: '+', '.join(sorted(missing)))
    features=['category','brand','condition']
    model=Pipeline([('prep',ColumnTransformer([('cat',OneHotEncoder(handle_unknown='ignore'),features)])),('rf',RandomForestRegressor(n_estimators=160,random_state=42,min_samples_leaf=2,n_jobs=1))])
    model.fit(df[features],df['price']);return model

def random_forest_market_price(category:str,brand:str,condition:str)->float:
    expected=float(price_model().predict(pd.DataFrame([{'category':category,'brand':brand or 'generic','condition':condition}]))[0]);return max(expected,1.0)

def price_score(actual:float,expected:float)->float:
    ratio=actual/max(expected,1)
    if ratio<.35:return 95.0
    if ratio<.50:return 85.0
    if ratio<.65:return 70.0
    if ratio<.80:return 50.0
    if ratio<.90:return 30.0
    if ratio<=1.25:return 8.0
    if ratio<=1.60:return 12.0
    return 18.0

def _extract_bdt_prices(text:str)->list[float]:
    if not text:return []
    patterns=[r'(?:bdt|৳|tk\.?|taka)\s*(\d[\d,]*(?:\.\d+)?)',r'(\d[\d,]*(?:\.\d+)?)\s*(?:bdt|৳|tk\.?|taka)']
    out=[]
    for pattern in patterns:
        for raw in re.findall(pattern,text,flags=re.I):
            try:value=float(raw.replace(',',''))
            except ValueError:continue
            if 100<=value<=10_000_000 and value not in out:out.append(value)
    return out

def live_bdt_reference(title:str,category:str,brand:str)->dict[str,Any]|None:
    if not SERPAPI_KEY:return None
    query=' '.join(x for x in [brand,title,category,'used price Bangladesh BDT'] if x)
    try:
        response=requests.get(SERPAPI_URL,params={'engine':'google','q':query,'api_key':SERPAPI_KEY,'num':8,'hl':'en','gl':'bd','location':'Bangladesh'},timeout=5)
        response.raise_for_status();data=response.json()
    except (requests.RequestException,ValueError):return None
    candidates=[]
    for key,bonus in [('shopping_results',10),('organic_results',0)]:
        rows=data.get(key,[])
        if not isinstance(rows,list):continue
        for row in rows:
            if not isinstance(row,dict):continue
            combined=' '.join(str(row.get(k,'')) for k in ['title','snippet','price'])
            prices=_extract_bdt_prices(combined)
            if not prices:continue
            lower=combined.lower();score=bonus+(4 if brand and brand.lower() in lower else 0)+(3 if category and category.lower() in lower else 0)+sum(2 for w in re.findall(r'[a-z0-9]+',title.lower()) if len(w)>=3 and w in lower)
            candidates.append({'price':prices[0],'score':score,'title':str(row.get('title','')),'source':str(row.get('source','Google')),'url':str(row.get('link',''))})
    if not candidates:return None
    candidates.sort(key=lambda x:x['score'],reverse=True);return candidates[0]

def price_risk(title:str,category:str,brand:str,condition:str,actual:float)->tuple[float,float,str,dict[str,Any]]:
    expected=random_forest_market_price(category,brand,condition);score=price_score(actual,expected);difference=(actual-expected)/expected*100
    reason=f'RandomForest estimated market price is about BDT {expected:,.0f}; listing price is BDT {actual:,.0f} ({abs(difference):.1f}% {"higher" if difference>0 else "lower" if difference<0 else "equal"}).'
    live=live_bdt_reference(title,category,brand)
    details={'primary_model':'RandomForestRegressor','model_market_price':round(expected,2),'listing_price':actual,'difference_percent':round(difference,2),'live_reference':live}
    if live:reason+=f' Secondary Google/SerpAPI evidence found a BDT reference near {live["price"]:,.0f}; it is explanatory only and does not replace the RandomForest score.'
    return score,expected,reason,details

@lru_cache(maxsize=1)
def text_model()->Pipeline:
    if not FRAUD_CSV.exists():raise FileNotFoundError(f'Fraud dataset not found: {FRAUD_CSV}')
    df=pd.read_csv(FRAUD_CSV);required={'title','description','label'};missing=required-set(df.columns)
    if missing:raise ValueError('Fraud dataset missing columns: '+', '.join(sorted(missing)))
    model=Pipeline([('tfidf',TfidfVectorizer(ngram_range=(1,2),min_df=1)),('nb',MultinomialNB())]);model.fit(df['title'].fillna('')+' '+df['description'].fillna(''),df['label']);return model

def similarity(a:str,b:str)->float:
    wa=set(re.findall(r'[a-z0-9]+',a.lower()));wb=set(re.findall(r'[a-z0-9]+',b.lower()));return len(wa&wb)/max(len(wa|wb),1)

def text_risk(title:str,description:str,existing:list[str])->tuple[float,str]:
    text=f'{title} {description}'.lower().strip();model=text_model();classes=list(model.named_steps['nb'].classes_);probs=model.predict_proba([text])[0];prob=float(probs[classes.index('suspicious')]) if 'suspicious' in classes else 0.0;reused=any(similarity(text,x)>=.92 for x in existing if x);score=min(100.0,prob*100+(25 if reused else 0));reason=f'TF-IDF/Naive Bayes suspicious-text probability is {prob:.0%}.'+(' Listing text is also highly similar to an existing description.' if reused else '');return score,reason

def _safe_int(value:Any)->int:
    try:return int(value or 0)
    except (TypeError,ValueError):return 0

def _safe_float(value:Any)->float:
    try:return float(value or 0)
    except (TypeError,ValueError):return 0.0

def seller_risk(s:dict[str,Any])->tuple[float,str]:
    score=0.0;reasons=[];age=_safe_int(s.get('account_age_days'));reports=_safe_int(s.get('report_count'));removed=_safe_int(s.get('removed_listings'));suspicious=_safe_int(s.get('suspicious_listings'));completed=_safe_int(s.get('completed_trades'));rating=_safe_float(s.get('rating_average'))
    if age<7:score+=28;reasons.append('new account')
    score+=min(30,reports*10);score+=min(25,removed*12);score+=min(20,suspicious*7)
    if completed>=5 and rating>=4:score-=18;reasons.append('positive completed-trade history')
    return max(0,min(100,score)),'Seller signals: '+(', '.join(reasons) if reasons else 'no strong historical risk signal')+'.'

def policy_risk(title:str,description:str,brand:str)->tuple[float,str]:
    text=f'{title} {description}'.lower();hits=[x for x in BANNED_TERMS|PROHIBITED_TERMS if x in text];known={'apple':['iphone','ipad','macbook'],'samsung':['galaxy','samsung'],'dell':['xps','latitude','inspiron']};mentioned=[b for b,words in known.items() if any(w in text for w in words)];mismatch=bool(brand and mentioned and brand.lower() not in mentioned);score=min(100,len(hits)*30+(35 if mismatch else 0));reasons=[]
    if hits:reasons.append('policy/off-platform phrases: '+', '.join(hits[:3]))
    if mismatch:reasons.append('brand field conflicts with recognizable product wording')
    return float(score),'; '.join(reasons) if reasons else 'No major policy or brand mismatch signal.'

@app.post('/analyze-listing')
def analyze(p:AnalyzeRequest)->dict[str,Any]:
    image_score,image_reason=image_risk(p.image_hashes,p.existing_image_hashes);price_s,expected,price_reason,price_details=price_risk(p.title,p.category,p.brand,p.condition,p.price);seller_score,seller_reason=seller_risk(p.seller_information);text_score,text_reason=text_risk(p.title,p.description,p.existing_descriptions);policy_score,policy_reason=policy_risk(p.title,p.description,p.brand)
    total=round(image_score*.25+price_s*.25+seller_score*.20+text_score*.20+policy_score*.10,2);status='safe' if total<30 else 'low_risk' if total<50 else 'suspicious' if total<70 else 'high_risk';scored=[(image_score,image_reason),(price_s,price_reason),(seller_score,seller_reason),(text_score,text_reason),(policy_score,policy_reason)];reasons=[r for score,r in scored if score>=30];explanation=' '.join(reasons) if reasons else 'No strong fraud indicators were detected.'
    return {'fraud_score':total,'trust_status':status,'image_score':round(image_score,2),'price_score':round(price_s,2),'seller_score':round(seller_score,2),'text_score':round(text_score,2),'policy_score':round(policy_score,2),'estimated_market_price':round(expected,2),'price_details':price_details,'explanation':explanation,'signals':{'image':image_reason,'price':price_reason,'seller':seller_reason,'text':text_reason,'policy':policy_reason},'model_name':'RADIUS Explainable Ensemble','model_version':'1.1','feature_snapshot':p.model_dump()}
