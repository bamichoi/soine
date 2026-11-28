'use client';

import {
  GoodplaceCustomerForm,
  GoodplaceCustomerLoader,
} from '@/components/goodplace-customer-form';

export function GoodplaceCustomerEdit({ code }: { code: string }) {
  return (
    <GoodplaceCustomerLoader code={code}>
      {(customer) => <GoodplaceCustomerForm customer={customer} />}
    </GoodplaceCustomerLoader>
  );
}
