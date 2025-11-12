
from paddleocr import PaddleOCR, draw_ocr

# 同样也是通过修改 lang 参数切换语种
ocr = PaddleOCR(lang="german") # 首次执行会自动下载模型文件
img_path = 'input.jpg '
result = ocr.ocr(img_path)
# 可通过参数控制单独执行识别、检测
# result = ocr.ocr(img_path, det=False) 只执行识别
# result = ocr.ocr(img_path, rec=False) 只执行检测
# 打印检测框和识别结果
for line in result:
    print(line)

# 可视化
from PIL import Image
image = Image.open(img_path).convert('RGB')
boxes = [line[0] for line in result]
txts = [line[1][0] for line in result]
scores = [line[1][1] for line in result]
im_show = draw_ocr(image, boxes, txts, scores, font_path='./scripts/fonts/standard.ttf')
im_show = Image.fromarray(im_show)
im_show.save('result.jpg')