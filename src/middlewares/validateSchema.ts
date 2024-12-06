import { Response, Request, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

const validateRequest = (
  schema: Partial<{
    body: ZodSchema<any>;
    params: ZodSchema<any>;
    query: ZodSchema<any>;
  }>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schema.body) schema.body.parse(req.body);
      if (schema.params) schema.params.parse(req.params);
      if (schema.query) schema.query.parse(req.query);

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
      } else {
        next(error);
      }
    }
  };
};

export default validateRequest;
