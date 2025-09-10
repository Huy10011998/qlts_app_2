export enum TypeProperty {
  String, // 0
  Text, // 1
  Int, // 2
  Decimal, // 3
  Bool, // 4
  Link, // 5
  Reference, // 6
  Date, // 7
  Time, // 8
  Image, // 9
  Enum, // 10
}

export enum SqlOperator {
  Equals,
  NotEquals,
  GreaterThan,
  LessThan,
  GreaterThanOrEqual,
  LessThanOrEqual,
  Contains,
  StartsWith,
  EndsWith,
  DoesNotContain,
  In,
  NotIn,
  IsNull,
  IsNotNull,
  IsEmpty,
  IsNotEmpty,
}
