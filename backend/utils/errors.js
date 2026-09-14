// MongoDB reports unique-index violations with error code 11000.
export const isDuplicateKeyError = (error) => error?.code === 11000;
