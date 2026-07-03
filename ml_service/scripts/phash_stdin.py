from io import BytesIO
import sys

import imagehash
from PIL import Image


def main() -> int:
    data = sys.stdin.buffer.read()
    with Image.open(BytesIO(data)) as image:
        print(str(imagehash.phash(image.convert("RGB"))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
