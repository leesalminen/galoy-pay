import { NextResponse } from "next/server"

import { URL_HOST_DOMAIN } from "../../../config/config"
import { NOSTR_PUBKEY, PAY_SERVER } from "../../../lib/config"
import {
  UserDefaultWalletIdDocument,
  UserDefaultWalletIdQuery,
  BtcPriceListDocument,
  BtcPriceListQuery,
} from "../../../lib/graphql/generated"
import { client } from "./graphql"

const nostrEnabled = !!NOSTR_PUBKEY

export async function GET(
  request: Request,
  { params }: { params: { username: string } },
) {
  console.log(NOSTR_PUBKEY)

  const { searchParams } = new URL(request.url)

  const username = params.username

  const amount = searchParams.get("amount")
  const currency = searchParams.get("currency")

  let amountInMsats: number | undefined

  if (amount && currency && currency !== "BTC") {
    const { data } = await client.query<BtcPriceListQuery>({
      query: BtcPriceListDocument,
      variables: { range: "ONE_DAY" },
      context: {
        "x-real-ip": request.headers.get("x-real-ip"),
        "x-forwarded-for": request.headers.get("x-forwarded-for"),
      },
    })

    if (data?.btcPriceList?.length) {
      const btcPrice = data?.btcPriceList[data.btcPriceList.length - 1]
      if(btcPrice && btcPrice.price) {
        const { base, offset } = btcPrice.price
        const priceRef = (base / 10 ** offset) / 100
        const convertedCurrencyAmount = Math.round(Number(amount) / priceRef)
        amountInMsats = convertedCurrencyAmount * 1000
      }
      
    }

  } else if (amount && Number.isInteger(Number(amount))) {
    amountInMsats = Number(amount) * 1000
  }

  let walletId: string | null = null

  try {
    const { data } = await client.query<UserDefaultWalletIdQuery>({
      query: UserDefaultWalletIdDocument,
      variables: { username },
      context: {
        "x-real-ip": request.headers.get("x-real-ip"),
        "x-forwarded-for": request.headers.get("x-forwarded-for"),
      },
    })
    walletId = data?.recipientWalletId
  } catch (err: unknown) {
    console.log(err)
  }

  if (!walletId) {
    return NextResponse.json({
      status: "ERROR",
      reason: `Couldn't find user '${username}'.`,
    })
  }

  const metadata = JSON.stringify([
    ["text/plain", `Payment to ${username}`],
    ["text/identifier", `${username}@${URL_HOST_DOMAIN}`],
  ])

  const callback = `${PAY_SERVER}/lnurlp/${username}/callback`

  let minSendable = 1000 // 1 sat in millisat
  let maxSendable = 100000000000 // 1 BTC in millisat

  if (amountInMsats) {
    minSendable = amountInMsats
    maxSendable = amountInMsats
  }

  return NextResponse.json({
    callback,
    minSendable,
    maxSendable,
    metadata,
    tag: "payRequest",
    ...(nostrEnabled
      ? {
          allowsNostr: true,
          nostrPubkey: NOSTR_PUBKEY,
        }
      : {}),
  })
}
