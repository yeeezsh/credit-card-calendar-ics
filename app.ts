import dayjs, { Dayjs } from "dayjs";
import { EventAttributes, createEvents, DateArray } from "ics";
import { writeFile } from "fs/promises";

const DATE_MONTH_YEAR = "DD-MM-YYYY";

type Card = {
  expired: {
    month: number; // 1 Jan - 12 Dec
    year: number; // YYYY 20200
  };
  nOfDue: number; // n, 15, 25 (default is 0 if due date = statement date)
  statement: number; // date of month, 17, 30
  name: string;
};

type CardDate = {
  date: Dayjs;
  format: string;
  dateType: "due" | "statement";
  n: number;
};

const createStatementCardDate = (c: Card) => {
  const now = dayjs().startOf("year");
  const expired = dayjs()
    .month(c.expired.month - 1)
    .year(c.expired.year)
    .startOf("month");

  console.log("now", now.format(DATE_MONTH_YEAR));
  console.log("expired", expired.format(DATE_MONTH_YEAR));

  const diffOfMonth = expired.diff(now, "month");
  console.log("diffOfMonth", diffOfMonth);

  const statementDates: CardDate[] = Array(diffOfMonth)
    .fill(0)
    .map((_e, i) => {
      const date = dayjs()
        .add(i - 1, "month")
        .startOf("day")
        .startOf("month")
        .date(c.statement);

      return {
        date,
        format: date.format(DATE_MONTH_YEAR),
        n: i,
        dateType: "statement",
      };
    });

  return statementDates;
};

const createDueCardDate = (statementDates: CardDate[], card: Card) => {
  const dueDates: CardDate[] = statementDates.map((s, i) => {
    const date = dayjs(s.date).add(card.nOfDue, "day");
    return {
      date,
      n: i,
      format: date.format(DATE_MONTH_YEAR),
      dateType: "due",
    };
  });

  return dueDates;
};

const startDateMaskUtil = (d: CardDate) => [
  Number(d.date.format("YYYY")),
  Number(d.date.format("MM")),
  Number(d.date.format("DD")),
];
const createEventDate = (cardDates: CardDate[], card: Card) => {
  const statementDate = cardDates.filter((d) => d.dateType === "statement")[0];
  const CALNAME = `Credit Card - ${card.name}`;

  const baseEvent: Partial<EventAttributes> = {
    calName: CALNAME,
    duration: { days: 1 },
  };

  const statementEvent = {
    ...baseEvent,
    title: `${card.name} - ${statementDate.dateType}`,
    start: startDateMaskUtil(statementDate) as DateArray,
    recurrenceRule:
      "FREQ=MONTHLY;" +
      "BYMONTHDAY=" +
      statementDate.date.format("DD") +
      ";" +
      "INTERVAL=1;" +
      "UNTIL=" +
      dayjs()
        .month(card.expired.month)
        .year(card.expired.year)
        .format("YYYYMMDDT000000Z") +
      ";",
  } as EventAttributes;
  const dueEvents = cardDates
    .filter((d) => d.dateType === "due")
    .map((e) => ({
      ...baseEvent,
      title: `${card.name} - ${e.dateType}`,
      start: startDateMaskUtil(e) as DateArray,
    })) as EventAttributes[];

  const { value, error } = createEvents([statementEvent, ...dueEvents]);
  return value;
};

const sampleCard: Card = {
  expired: {
    month: 6,
    year: 2026,
  },
  nOfDue: 50 - 30, // free date
  statement: 12,
  name: "Krungsri",
};

const statementDates = createStatementCardDate(sampleCard);
const dueDates = createDueCardDate(statementDates, sampleCard);
const events = createEventDate([...statementDates, ...dueDates], sampleCard);
statementDates &&
  writeFile("./statement.txt", statementDates.map((e) => e.format).join("\n"));
dueDates &&
  writeFile("./duedate.txt", dueDates.map((e) => e.format).join("\n"));
events && writeFile("./calendar.ics", events);
