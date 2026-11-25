import type { SalesSummary } from '@/lib/choidolsang-sales-api';
import { formatWon } from '@/lib/money';

// 돌상 컨셉별 매출. 비중은 얇은 막대로 함께 보여 준다.
export function SalesConceptTable({ rows }: { rows: SalesSummary['byConcept'] }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">돌상 컨셉별 매출</h3>
      <div className="overflow-x-auto border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-[32rem] table-fixed text-left text-sm">
          <thead className="border-b border-[var(--line)] bg-[var(--background)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium" scope="col">
                돌상 컨셉
              </th>
              <th className="w-20 px-4 py-3 text-right font-medium" scope="col">
                건수
              </th>
              <th className="w-32 px-4 py-3 text-right font-medium" scope="col">
                매출
              </th>
              <th className="w-40 px-4 py-3 font-medium" scope="col">
                비중
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b border-[var(--line)] last:border-b-0" key={row.conceptId}>
                <td className="px-4 py-3">
                  <p className="truncate">
                    {row.name}
                    {row.isDeleted ? <span className="text-[var(--muted)]"> (삭제됨)</span> : null}
                  </p>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{row.count}건</td>
                <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                  {formatWon(row.totalAmount)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 flex-1 bg-[var(--background)]">
                      <span
                        className="block h-full rounded-r-[2px] bg-[var(--brand)]"
                        style={{ width: `${Math.min(row.share, 100)}%` }}
                      />
                    </span>
                    <span className="w-11 text-right text-xs tabular-nums">{row.share}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            이 기간 매출이 없습니다.
          </p>
        ) : null}
      </div>
    </section>
  );
}
