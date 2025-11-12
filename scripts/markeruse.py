import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor
from marker.converters.pdf import PdfConverter
from marker.models import create_model_dict
from marker.config.parser import ConfigParser

"""
markeruse .env
DATA_DIR="./data/pdfs"
OUTPUT_FORMAT=markdown
"""


class PDFProcessor:
    def __init__(self, config=None):
        """
        Initialize PDF processor with optional config.
        Default config:
            output_format: "markdown"
            max_pages: 1
            parallel_requests: 1
            language: "german"
        """
        # Set MPS memory management before any PyTorch operations
        os.environ['PYTORCH_MPS_HIGH_WATERMARK_RATIO'] = '0.0'
        os.environ['PYTORCH_ENABLE_MPS_FALLBACK'] = '1'
        self.config = config or {
            "output_format": "markdown",
            "max_pages": None,
            "parallel_requests": 1,
            "language": "de",
            "force_ocr": False,  # Set to True for scanned documents with text overlays
            # Increase to 120-150 for better OCR quality on scanned documents
            "lowres_image_dpi": 96,
            "highres_image_dpi": 192,  # Increase to 300 for high-quality OCR output
            # Lower to 0.15 for documents with poor layout quality
            "layout_coverage_threshold": 0.25,
            # Lower to 0.7 for documents with mixed quality text
            "min_document_ocr_threshold": 0.85,
            # Set to 1-4 for better OCR accuracy on complex documents
            "recognition_batch_size": None,
            "strip_existing_ocr": False  # Keep existing OCR text when force_ocr is True
        }

        # Load environment variables
        load_dotenv()
        self.data_dir = os.getenv('DATA_DIR')
        if not self.data_dir:
            self.data_dir = './data/pdfs'
            print(
                "Warning: DATA_DIR not specified in .env file, using default './data/pdfs'")
        # Initialize converter
        config_parser = ConfigParser(self.config)
        self.converter = PdfConverter(
            config=config_parser.generate_config_dict(),
            artifact_dict=create_model_dict(),
            processor_list=config_parser.get_processors(),
            renderer=config_parser.get_renderer(),
            llm_service=config_parser.get_llm_service()
        )

    def process_pdf(self, pdf_path, output_dir=None):
        """Process a single PDF file and return the markdown output"""
        if not output_dir:
            output_dir = os.path.join(self.data_dir, 'md', pdf_path.stem)

        # Ensure output directory exists before processing
        os.makedirs(output_dir, exist_ok=True)

        try:
            rendered = self.converter(str(pdf_path))
            output_path = os.path.join(output_dir, f"{pdf_path.stem}.md")
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(rendered.markdown)

            # Handle image extraction
            images_dir = os.path.join(output_dir, '')
            os.makedirs(images_dir, exist_ok=True)

            from marker.output import text_from_rendered, convert_if_not_rgb
            from marker.settings import settings
            _, _, images = text_from_rendered(rendered)

            # Process images dictionary (key: image name, value: PIL Image object)
            for img_name, img in images.items():
                # Convert image to RGB if needed
                img = convert_if_not_rgb(img)
                # Save image using PIL's save method
                img_path = os.path.join(images_dir, img_name)
                img.save(img_path, settings.OUTPUT_IMAGE_FORMAT)
            # Handle JSON output if applicable
            json_text, ext, _ = text_from_rendered(rendered)
            if ext == "json":
                json_path = os.path.join(output_dir, f"{pdf_path.stem}.json")
                with open(json_path, 'w', encoding='utf-8') as f:
                    f.write(json_text)

            return True
        except Exception as e:
            print(f"Error processing {pdf_path.name}: {e}")
            return False

    def process_directory(self, verbose=True):
        """Process all PDFs in the configured data directory"""
        # Create base md directory if it doesn't exist
        md_base_dir = os.path.join(self.data_dir, 'md')
        os.makedirs(md_base_dir, exist_ok=True)

        pdf_files = list(Path(self.data_dir).glob('*.pdf'))
        total_files = len(pdf_files)

        if verbose:
            print(f"\nFound {total_files} PDF file(s) to process:")
            print("=" * 40)
            for i, pdf_path in enumerate(pdf_files, 1):
                print(f"  [{i:02d}/{total_files:02d}] {pdf_path.name}")
            print("=" * 40)
            print("Starting processing...\n")

        for i, pdf_path in enumerate(pdf_files, 1):
            if verbose:
                print(
                    f"Processing [{i:02d}/{total_files:02d}] {pdf_path.name}")
                print("-" * 60)

            # Create document-specific directory under md/
            doc_output_dir = os.path.join(md_base_dir, pdf_path.stem)
            success = self.process_pdf(pdf_path, doc_output_dir)

            if verbose:
                status = "✓ Success" if success else "✗ Failed"
                print(
                    f"\nFinished [{i:02d}/{total_files:02d}] {pdf_path.name}: {status}")
                if success:
                    print(f"Output files stored in: {doc_output_dir}")
                print("=" * 60 + "\n")

    async def process_pdf_async(self, pdf_path, output_dir=None):
        """Async wrapper for process_pdf"""
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as pool:
            return await loop.run_in_executor(
                pool, self.process_pdf, pdf_path, output_dir
            )

    async def process_directory_async(self, max_concurrent=2, verbose=True):
        """Process PDFs concurrently"""
        semaphore = asyncio.Semaphore(max_concurrent)

        async def process_with_semaphore(pdf_path):
            async with semaphore:
                if verbose:
                    print(f"Processing {pdf_path.name}")
                return await self.process_pdf_async(pdf_path)

        # Create base md directory if it doesn't exist
        md_base_dir = os.path.join(self.data_dir, 'md')
        os.makedirs(md_base_dir, exist_ok=True)

        pdf_files = list(Path(self.data_dir).glob('*.pdf'))
        total_files = len(pdf_files)

        if verbose:
            print(f"\nFound {total_files} PDF file(s) to process:")
            print("=" * 40)
            for i, pdf_path in enumerate(pdf_files, 1):
                print(f"  [{i:02d}/{total_files:02d}] {pdf_path.name}")
            print("=" * 40)
            print(
                f"Starting async processing with {max_concurrent} concurrent tasks...\n")

        tasks = [process_with_semaphore(p) for p in pdf_files]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        if verbose:
            success_count = sum(1 for r in results if r is True)
            print(
                f"\nProcessing complete: {success_count}/{total_files} succeeded")
            print("=" * 60 + "\n")

        return results


if __name__ == "__main__":
    processor = PDFProcessor()
    processor.process_directory()
