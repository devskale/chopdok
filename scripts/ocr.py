# ocr.py

import pytesseract
from pdf2image import convert_from_path
from PIL import Image
import os
from dotenv import load_dotenv
import easyocr
import numpy as np
# from paddleocr import PaddleOCR


class OCRExtractor:
    def __init__(self, lang='deu'):
        self.lang = lang

    def extract_text(self, pdf_path):
        # Convert PDF to images
        images = convert_from_path(pdf_path)

        full_text = []
        for i, image in enumerate(images):
            # Perform OCR on each image
            #
            text = pytesseract.image_to_string(
                image,
                lang=self.lang
            )
            full_text.append(text)

        # Join all extracted text
        combined_text = "\n\n".join(full_text)

        return combined_text, len(images)


def get_ocr_extractor(lang='deu'):
    return OCRExtractor(lang)


class EasyOCRExtractor:
    def __init__(self, lang='de'):
        self.reader = easyocr.Reader([lang])

    def extract_text(self, pdf_path):
        images = convert_from_path(pdf_path)
        full_text = []
        for image in images:
            result = self.reader.readtext(np.array(image), detail=0)
            full_text.append("\n".join(result))
        combined_text = "\n\n".join(full_text)
        return combined_text, len(images)


class PaddleOCRExtractor:
    def __init__(self, lang='de'):
        self.ocr = PaddlpaddleOCR(
            use_angle_cls=True,
            lang=lang,
            ocr_version='PP-OCR'
        )

    def extract_text(self, pdf_path):
        images = convert_from_path(pdf_path)
        full_text = []
        for image in images:
            result = self.ocr.ocr(np.array(image), cls=True)
            text = [line[1][0] for line in result[0]]
            full_text.append("\n".join(text))
        combined_text = "\n\n".join(full_text)
        return combined_text, len(images)
