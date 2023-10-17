import { useState } from "react"

import { gql } from "@apollo/client"
import {
  useLnInvoiceCreateOnBehalfOfRecipientMutation,
} from "../lib/graphql/generated"

interface Props {

}

gql`
 mutation lnInvoiceCreateOnBehalfOfRecipient($walletId: WalletId!, $amount: SatAmount!, $memo: Memo) {
    lnInvoiceCreateOnBehalfOfRecipient(
      input: { recipientWalletId: $walletId, amount: $amount, memo: $memo }
    ) {
      errors {
        message
      }
      invoice {
        paymentRequest
        paymentHash
      }
    }
  }
`
const useCreateInvoice = ({ }: Props) => {
  const [invoiceStatus, setInvoiceStatus] = useState<
    "loading" | "new" | "need-update" | "expired"
  >("loading")

  const mutation = useLnInvoiceCreateOnBehalfOfRecipientMutation({
    onError: console.error,
    onCompleted: () => setInvoiceStatus("new"),
  })

  const [createInvoice, { loading, error, data }] = mutation

  return {
    createInvoice,
    setInvoiceStatus,
    invoiceStatus,
    loading,
    errorsMessage: error?.message,
    error,
    data,
  }
}

export default useCreateInvoice
