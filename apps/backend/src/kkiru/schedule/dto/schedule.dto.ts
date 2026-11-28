import { DateOnlyField } from '../../common/kkiru-fields';

/** 달력에 보여 줄 기간. from 이상 to 미만 (한국 날짜, YYYY-MM-DD) */
export class ScheduleQueryDto {
  @DateOnlyField()
  from!: string;

  @DateOnlyField()
  to!: string;
}
