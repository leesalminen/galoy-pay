import React, { useEffect } from "react"
import { useCurrencyListQuery } from "../../lib/graphql/generated"
import { useRouter } from "next/router"

export default function CurrencyDropdown({
  onSelectedDisplayCurrencyChange,
  name,
  style,
  showOnlyFlag = false,
}: {
  onSelectedDisplayCurrencyChange?: (newDisplayCurrency: string) => void
  name?: string
  style?: React.CSSProperties
  showOnlyFlag?: boolean
}) {
  return (<div></div>)
}
