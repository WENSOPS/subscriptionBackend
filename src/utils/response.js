// Success Response
export const successResponse = (
  res,
  data,
  message = "Success",
  statusCode = 200,
) => {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data,
  });
};

// Error Response
export const errorResponse = (
  res,
  message = "Error",
  statusCode = 500,
  errors = null,
) => {
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
  });
};

// Built-in Success Responses
export const created = (
  res,
  data,
  message = "Resource created successfully",
) => {
  return successResponse(res, data, message, 201);
};

export const ok = (res, data, message = "Success") => {
  return successResponse(res, data, message, 200);
};

export const accepted = (res, data, message = "Request accepted") => {
  return successResponse(res, data, message, 202);
};

export const noContent = (res, message = "No content") => {
  return res.status(204).json({
    success: true,
    statusCode: 204,
    message,
  });
};

// Built-in Error Responses
export const notFound = (res, message = "Resource not found") => {
  return errorResponse(res, message, 404);
};

export const badRequest = (res, message = "Bad request", errors = null) => {
  return errorResponse(res, message, 200, errors);
};

export const unauthorized = (res, message = "Unauthorized access") => {
  return errorResponse(res, message, 401);
};

export const forbidden = (res, message = "Access forbidden") => {
  return errorResponse(res, message, 403);
};

export const conflict = (
  res,
  message = "Resource already exists",
  errors = null,
) => {
  return errorResponse(res, message, 409, errors);
};

export const unprocessable = (
  res,
  message = "Unprocessable entity",
  errors = null,
) => {
  return errorResponse(res, message, 422, errors);
};

export const internalError = (res, message = "Internal server error") => {
  return errorResponse(res, message, 500);
};

export const serviceUnavailable = (res, message = "Service unavailable") => {
  return errorResponse(res, message, 503);
};
