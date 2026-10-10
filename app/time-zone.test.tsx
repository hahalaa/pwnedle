// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { TimeZone } from "./time-zone";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

test("sets the tz cookie and refreshes once, then leaves it alone (R2)", () => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  render(<TimeZone />);
  expect(document.cookie).toBe(`tz=${tz}`);
  expect(refresh).toHaveBeenCalledTimes(1);
  render(<TimeZone />);
  expect(refresh).toHaveBeenCalledTimes(1);
});
