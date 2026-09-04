create unique index if not exists uq_documents_payment_receipt
  on public.documents(payment_id)
  where document_type='receipt' and payment_id is not null;

create unique index if not exists uq_documents_quotation_type
  on public.documents(quotation_id, document_type)
  where quotation_id is not null and document_type in ('quotation','invoice');
