from docling.document_converter import DocumentConverter

source = "https://arxiv.org/pdf/2408.09869"  # PDF path or URL
converter = DocumentConverter()
result = converter.convert(source)
# output: "### Docling Technical Report[...]"
markdown = result.document.export_to_markdown()
# save to file
with open("output.md", "w") as f:
    f.write(markdown)
