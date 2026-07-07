// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PdfUploader } from "./PdfUploader";

describe("<PdfUploader />", () => {
  it("renders the upload prompt before any file is loaded", () => {
    render(<PdfUploader />);
    expect(screen.getByText(/Click to upload/i)).toBeTruthy();
    expect(screen.getByText(/PDF files only/i)).toBeTruthy();
  });

  it("renders no page thumbnails initially", () => {
    const { container } = render(<PdfUploader />);
    expect(container.querySelectorAll('img[alt^="Page "]')).toHaveLength(0);
  });
});
