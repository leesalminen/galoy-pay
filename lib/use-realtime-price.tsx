import { gql, SubscriptionResult } from "@apollo/client"
import * as React from "react"
import {
  PriceSubcription,
  usePriceSubscription,
  useBtcPriceListQuery,
} from "../lib/graphql/generated"
import { useDisplayCurrency } from "../lib/use-display-currency"

gql`
  subscription price(
    $amount: SatAmount!
    $amountCurrencyUnit: ExchangeCurrencyUnit!
    $priceCurrencyUnit: ExchangeCurrencyUnit!
  ) {
    price(
      input: {
        amount: $amount
        amountCurrencyUnit: $amountCurrencyUnit
        priceCurrencyUnit: $priceCurrencyUnit
      }
    ) {
      errors {
        message
      }
      price {
        base
        offset
        currencyUnit
        formattedAmount
      }
    }
  }

  query btcPriceList($range: PriceGraphRange!) {
    btcPriceList(range: $range) {
      timestamp
      price {
        base
        offset
        currencyUnit
      }
    }
  }
`

const useRealtimePrice = (
  currency: string,
  onSubscriptionDataCallback?: (
    subscriptionData: SubscriptionResult<RealtimePriceWsSubscription, any>,
  ) => void,
) => {
  const priceRef = React.useRef<number>(0)
  const { formatCurrency } = useDisplayCurrency()
  const hasLoaded = React.useRef<boolean>(false)

  const { loading, data, error } = usePriceSubscription({
    variables: {
      amount: 1,
      amountCurrencyUnit: "BTCSAT",
      priceCurrencyUnit: "USDCENT",
    },
    onData({ subscriptionData }) {
      if (onSubscriptionDataCallback) onSubscriptionDataCallback(subscriptionData)
    },
  })

  const { data: initialData } = useBtcPriceListQuery({
    variables: { range: "ONE_DAY" },
    onCompleted(initData) {
      if (initData?.btcPriceList?.length) {
        const btcPrice = initData?.btcPriceList[initData.btcPriceList.length - 1]
        const { base, offset } = btcPrice.price
        priceRef.current = (base / 10 ** offset) / 100
      }
    },
  })

  React.useEffect(() => {
    if ((data || initialData) && !hasLoaded.current) {
      // Subscription data or graphql data has loaded for the first time
      hasLoaded.current = true
    }
  }, [data, initialData])

  const conversions = React.useMemo(
    () => ({
      satsToCurrency: (sats: number, display: string, fractionDigits: number) => {
        sats = (sats / 100_000_000)
        const convertedCurrencyAmount =
          fractionDigits === 2 ? (sats * priceRef.current) / 100 : sats * priceRef.current
        const formattedCurrency = formatCurrency({
          amountInMajorUnits: convertedCurrencyAmount,
          currency: display,
          withSign: true,
        })
        return {
          convertedCurrencyAmount,
          formattedCurrency,
        }
      },
      currencyToSats: (currency: number, display: string, fractionDigits: number) => {
        const convertedCurrencyAmount =
          fractionDigits === 2
            ? (100 * currency) / priceRef.current
            : (currency / priceRef.current) * 100_000_000
        const formattedCurrency = formatCurrency({
          amountInMajorUnits: convertedCurrencyAmount,
          currency: display,
          withSign: true,
        })
        return {
          convertedCurrencyAmount,
          formattedCurrency,
        }
      },
      hasLoaded: hasLoaded,
    }),
    [priceRef, formatCurrency],
  )

  if (data?.price?.price) {
    const { base, offset } = data.price.price
    priceRef.current = ( (base / 10 ** offset) / 100 ) * 100_000_000
  }

  if (priceRef.current === 0) {
    return {
      satsToCurrency: () => {
        return {
          convertedCurrencyAmount: NaN,
          formattedCurrency: "0",
        }
      },
      currencyToSats: () => {
        return {
          convertedCurrencyAmount: NaN,
          formattedCurrency: "0",
        }
      },
      hasLoaded: hasLoaded,
    }
  }

  return conversions
}
export default useRealtimePrice
