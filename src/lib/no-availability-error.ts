export class NoAvailabilityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly data: Array<{
      id: string;
      availableQuantity: number;
      available: boolean;
    }>,
  ) {
    super(message);
    this.name = "NoAvailabilityError";
  }
}
