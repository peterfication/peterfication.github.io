---
layout: post
title: Streak calculation in PostgreSQL
date: 2023-04-23
categories: ["postgresql"]
---

A lot of online services use streaks as an element of gamification so that a user maintains a certain behavior. In Duolingo for example you can keep a streak of continuous days of learning.

To calculate such streaks, you could use a loop and a days counter to iterate over the streak relevant elements. Depending on the size of the data, this could become pretty slow to calculate pretty fast.

A more efficient way to calculate streaks is to let the database do this job for us. PostgreSQL has a nice feature called [window functions](https://www.postgresql.org/docs/current/tutorial-window.html) which can make use of the [`ROW_NUMBER()`](https://www.postgresql.org/docs/current/functions-window.html).

Let's assume we have some online service for cars and we want to create a streak for days when the car was moved less than 20km. In this example we could have such a table: `car_daily_usages(id, car_id, day, distance)`.

If we now get all daily usages of a car and assign a row number to each row, we can subtract the row number from the day and all days that belong to the same streak will have the same result for this calculation, even though the result of this calculation is kind of meaningless as it depends on the full result of the query and not on the streak itself. Before providing the SQL query, let's explain the strategy a bit more.

When providing example values for days that qualify for a streak, the row numbers and the resulting calculation, it becomes clear how it works:

```
row number  day         calculated day

1           2023-03-02  2023-02-01
2           2023-03-03  2023-02-01
3           2023-03-04  2023-02-01

4           2023-03-10  2023-03-06
5           2023-03-11  2023-03-06
6           2023-03-12  2023-03-06
7           2023-03-13  2023-03-06
```

For the first streak, the days minus the row numbers will always result in `2023-02-01` and in the second streak, it will always result in `2023-03-06`. However, this is only true for this result set. If there was another streak before, the calculated days would be different, but the same rows would still have the same calculated days. So we can think of the calculated days an identifier of a **streak group**. We could also hash that value to make sure it's not confused with a date. With that result, we can aggregate by the calculated day aka streak group and get a start date and end date for a streak, as well as a days count by using the normal PostgreSQL aggregation functions.

In order to make this calculation work in a single query we have to use [common table expressions](https://www.postgresql.org/docs/current/queries-with.html) to make use of the row numbers and calculated streak groups.

```SQL
WITH
-- Get a result set with streak groups
car_daily_usages_with_streaks AS (
  SELECT
    *,
    (day - ROW_NUMBER() OVER ()::integer) AS streak_group
  FROM car_daily_usages
  WHERE car_id = 'example-car-id'
    AND distance < 20
  ORDER BY day
),

-- Aggregate the streak groups and filter out single days
streak_groups AS (
  SELECT
    MIN(day) AS start_at,
    MAX(day) AS end_at,
    COUNT(*) AS days_count
  FROM car_daily_usages_with_streaks
  GROUP BY streak_group
  HAVING COUNT(*) >= 2
)

SELECT *
FROM streak_groups
```

> NOTE: if we get the row number over the car ID and group the streak groups also by car ID, we can get all streaks for all cars in a single query.
