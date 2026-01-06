import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders Notes header", () => {
  render(<App />);
  const title = screen.getByText(/Notes/i);
  expect(title).toBeInTheDocument();
});
