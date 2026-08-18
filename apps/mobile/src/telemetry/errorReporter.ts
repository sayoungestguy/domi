export type ErrorContext = Record<string, string | number | boolean>;

export type ErrorReporter = {
  capture(error: Error, context?: ErrorContext): void;
};

const noOpReporter: ErrorReporter = {
  capture: () => undefined,
};

let reporter = noOpReporter;

export function configureErrorReporter(nextReporter: ErrorReporter): void {
  reporter = nextReporter;
}

export function captureError(error: Error, context?: ErrorContext): void {
  reporter.capture(error, context);
}
