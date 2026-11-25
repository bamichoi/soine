'use client';

import { KkiruCustomerForm, KkiruCustomerLoader } from '@/components/kkiru-customer-form';

export function KkiruCustomerEdit({ code }: { code: string }) {
  return (
    <KkiruCustomerLoader code={code}>
      {(customer) => <KkiruCustomerForm customer={customer} />}
    </KkiruCustomerLoader>
  );
}
