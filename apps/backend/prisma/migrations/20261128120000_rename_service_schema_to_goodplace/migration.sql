-- 서비스 이름 변경(ADR-0010): 스키마를 통째로 새 이름으로 바꾼다.
-- 테이블(관리자 계정·세션 포함), enum, 인덱스, 제약은 스키마를 따라 옮겨지고 데이터는 그대로다.
ALTER SCHEMA "kkiru" RENAME TO "goodplace";
