import type { NextFunction, Request, RequestHandler, Response } from 'express';

export type PreparedInput<T> = T | { exception: TypeError | RangeError };

export function prepareInput<T>(
  read: (req: Request<object, unknown, unknown>) => unknown,
  validate: (input: unknown) => T,
): RequestHandler<object, unknown, unknown, Request['query'], { input: PreparedInput<T> }> {
  return function prepare(
    req: Request<object, unknown, unknown>,
    res: Response<unknown, { input: PreparedInput<T> }>,
    next: NextFunction,
  ): void {
    try {
      res.locals.input = validate(read(req));
    } catch (error) {
      if (!(error instanceof TypeError) && !(error instanceof RangeError)) throw error;
      // Some flows must check resource existence before surfacing input conversion errors.
      res.locals.input = { exception: error };
    }
    next();
  };
}
