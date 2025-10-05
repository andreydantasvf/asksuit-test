const { z } = require('zod');

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const toUTCDate = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const startOfTodayUTC = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const dateStringSchema = (fieldName) => z.string({
  required_error: `${fieldName} date is required`
}).regex(ISO_DATE_REGEX, `${fieldName} must follow the format YYYY-MM-DD`)
  .superRefine((value, ctx) => {
    const date = toUTCDate(value);

    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${fieldName} is not a valid date`
      });
      return;
    }

    if (date < startOfTodayUTC()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${fieldName} cannot be in the past`
      });
    }
  });

const searchRequestSchema = z.object({
  checkin: dateStringSchema('Checkin'),
  checkout: dateStringSchema('Checkout')
}).superRefine((data, ctx) => {
  const checkinDate = toUTCDate(data.checkin);
  const checkoutDate = toUTCDate(data.checkout);

  if (checkoutDate <= checkinDate) {
    ctx.addIssue({
      path: ['checkout'],
      code: z.ZodIssueCode.custom,
      message: 'Checkout date must be after checkin date'
    });
  }
});

module.exports = {
  searchRequestSchema
};
