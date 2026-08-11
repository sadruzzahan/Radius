from __future__ import annotations
import csv, random, sys
from pathlib import Path

BASE=Path(__file__).resolve().parents[1]/'data'
random.seed(479)
CATEGORIES={'phone':(12000,90000),'laptop':(18000,120000),'camera':(15000,100000),'furniture':(1500,25000),'bicycle':(5000,40000),'appliance':(4000,65000),'fashion':(500,12000),'books':(100,5000),'gaming':(3000,80000),'accessories':(300,25000)}
BRANDS=['generic','Apple','Samsung','Dell','HP','Lenovo','Canon','Sony','LG','Xiaomi']
CONDS=['new','excellent','good','fair','poor']

def prices(n:int):
    path=BASE/'market_prices_expanded.csv'
    with path.open('w',newline='',encoding='utf-8') as f:
        w=csv.writer(f); w.writerow(['category','brand','condition','price'])
        for _ in range(n):
            cat=random.choice(list(CATEGORIES)); lo,hi=CATEGORIES[cat]; cond=random.choice(CONDS); factor={'new':1,'excellent':.9,'good':.72,'fair':.52,'poor':.35}[cond]
            w.writerow([cat,random.choice(BRANDS),cond,round(random.uniform(lo,hi)*factor)])

def fraud(n:int):
    path=BASE/'fraud_listings_synthetic.csv'; normal=['available for inspection','pickup and check','used carefully','good working condition']; bad=['urgent pay first','send advance whatsapp me','telegram outside platform only','bkash first no inspection']
    with path.open('w',newline='',encoding='utf-8') as f:
        w=csv.writer(f); w.writerow(['title','description','category','label'])
        for i in range(n):
            suspicious=i%2==1; cat=random.choice(list(CATEGORIES)); w.writerow([f'{cat} item {i}',random.choice(bad if suspicious else normal),cat,'suspicious' if suspicious else 'normal'])

if __name__=='__main__':
    prices(int(sys.argv[1]) if len(sys.argv)>1 else 15000); fraud(int(sys.argv[2]) if len(sys.argv)>2 else 20000); print('Datasets generated.')
