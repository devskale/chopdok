// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocumentAssembler } from "./DocumentAssembler";

describe("<DocumentAssembler />", () => {
  it("renders the upload prompt before any file is loaded", () => {
    render(<DocumentAssembler />);
    expect(screen.getByText(/Click to upload/i)).toBeTruthy();
    expect(screen.getByText(/PDFs & images · mix freely/i)).toBeTruthy();
  });

  it("renders no item cards initially", () => {
    const { container } = render(<DocumentAssembler />);
    // Grid cards are the only draggable elements in the initial view.
    expect(container.querySelectorAll("[draggable='true']")).toHaveLength(0);
  });
});
