import { Response } from "express";

type ApiResponseData = Record<string, unknown> | null | unknown[] | Document;

export const apiResponse = (
  res: Response,
  status: number,
  success: boolean,
  message: string,
  data?: ApiResponseData
): void => {
  res.status(status).json({
    success,
    message,
    data: data || null,
  });
};

export default apiResponse;
