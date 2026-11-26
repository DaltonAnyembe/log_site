/**
 * Payment rules: supported crypto methods, USD -> crypto quotes, wallet links
 * (BIP21 for Bitcoin, EIP-681 for ERC-20 USDT) and order references.
 *
 * DOM-free so the rules can be tested in isolation (see tests/selftest.js).
 * Addresses and rates live in data/site.json under "payments"; the defaults
 * below are only a fallback when that block is missing or incomplete.
 */

export const DEFAULT_PAYMENTS = {
  referencePrefix: 'SSC',
  methods: {
    btc: {
      id: 'btc',
      kind: 'btc',
      label: 'Bitcoin',
      ticker: 'BTC',
      network: 'Bitcoin network',
      address: 'bc1qv8epx678qzs5e7nr4ftjtypm9vg3zhtwrckjpf',
      rateUsd: 95000,
      decimals: 8,
      explorer: 'https://mempool.space/address/'
    },
    usdt: {
      id: 'usdt',
      kind: 'erc20',
      label: 'Tether USDT',
      ticker: 'USDT',
      network: 'Ethereum (ERC-20)',
      address: '0x7E2474834091A0Aa7aCc02a92468BE41A0c5722b',
      contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      chainId: 1,
      rateUsd: 1,
      decimals: 6,
      explorer: 'https://etherscan.io/address/'
    }
  }
};

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BECH32_GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
// bech32 (segwit v0) and bech32m (segwit v1+) both end with a valid checksum.
const BECH32_CHECKSUMS = [1, 0x2bc830a3];

function bech32Polymod(values) {
  let checksum = 1;
  values.forEach((value) => {
    const top = checksum >> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    for (let bit = 0; bit < 5; bit += 1) {
      if ((top >> bit) & 1) checksum ^= BECH32_GENERATOR[bit];
    }
  });
  return checksum;
}

function bech32HrpExpand(hrp) {
  const expanded = [];
  for (let index = 0; index < hrp.length; index += 1) expanded.push(hrp.charCodeAt(index) >> 5);
  expanded.push(0);
  for (let index = 0; index < hrp.length; index += 1) expanded.push(hrp.charCodeAt(index) & 31);
  return expanded;
}

/**
 * Mainnet bech32 addresses: the right prefix and charset plus a valid checksum,
 * so a single mistyped character is caught before an order is placed.
 */
export function isBitcoinAddress(value) {
  const address = cleanString(value).toLowerCase();
  if (!/^bc1[ac-hj-np-z02-9]{11,71}$/.test(address)) return false;

  const data = [];
  for (const character of address.slice(3)) {
    const index = BECH32_CHARSET.indexOf(character);
    if (index === -1) return false;
    data.push(index);
  }

  const checksum = bech32Polymod([...bech32HrpExpand('bc'), ...data]);
  return BECH32_CHECKSUMS.includes(checksum);
}

/** EVM addresses are 0x followed by 40 hex characters. */
export function isEvmAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(cleanString(value));
}

/**
 * Merge the editable "payments" block from data/site.json over the defaults.
 * Unknown method ids are kept so extra wallets only need a JSON entry.
 */
export function paymentConfig(raw) {
  const source = isPlainObject(raw) ? raw : {};
  const overrides = isPlainObject(source.methods) ? source.methods : {};
  const ids = new Set([...Object.keys(DEFAULT_PAYMENTS.methods), ...Object.keys(overrides)]);

  const methods = {};
  ids.forEach((id) => {
    const base = DEFAULT_PAYMENTS.methods[id] ?? {};
    const override = isPlainObject(overrides[id]) ? overrides[id] : {};
    methods[id] = { ...base, ...override, id };
  });

  return {
    referencePrefix: cleanString(source.referencePrefix) || DEFAULT_PAYMENTS.referencePrefix,
    methods
  };
}

/** True when the method has a valid address (and contract for ERC-20 tokens). */
export function isMethodPayable(method) {
  if (!isPlainObject(method)) return false;

  if (method.kind === 'btc') {
    return isBitcoinAddress(method.address);
  }

  if (method.kind === 'erc20') {
    const chainId = Number.parseInt(method.chainId, 10);
    return (
      isEvmAddress(method.address) &&
      isEvmAddress(method.contract) &&
      Number.isFinite(chainId) &&
      chainId > 0
    );
  }

  return false;
}

/** Every method that can actually be paid to, in config order. */
export function payableMethods(config) {
  const methods = isPlainObject(config?.methods) ? config.methods : {};
  return Object.values(methods).filter(isMethodPayable);
}

/**
 * Turn an integer amount in minor units into a decimal string.
 * formatUnits(68421, 8) -> "0.00068421", formatUnits(65000000, 6, 2) -> "65.00".
 */
export function formatUnits(units, decimals, minDecimals = 0) {
  const value = Number.parseInt(units, 10);
  const places = Math.min(Math.max(Number.parseInt(decimals, 10) || 0, 0), 8);
  if (!Number.isFinite(value)) return '';

  const sign = value < 0 ? '-' : '';
  const factor = 10 ** places;
  const whole = Math.trunc(Math.abs(value) / factor);
  const fraction = String(Math.abs(value) % factor)
    .padStart(places, '0')
    .replace(/0+$/, '');
  const padded = fraction.padEnd(Math.min(Math.max(minDecimals, 0), places), '0');
  return padded ? `${sign}${whole}.${padded}` : `${sign}${whole}`;
}

/**
 * Quote a USD price in one method. Returns null when the method is not payable
 * or the price is unusable, so callers can hide the option instead of guessing.
 */
export function methodQuote(method, priceUsd) {
  const price = Number(priceUsd);
  const rate = Number(method?.rateUsd);
  if (!isMethodPayable(method) || !Number.isFinite(price) || price <= 0) return null;
  if (!Number.isFinite(rate) || rate <= 0) return null;

  const decimals = Number.isInteger(method.decimals)
    ? Math.min(Math.max(method.decimals, 0), 8)
    : method.kind === 'btc'
      ? 8
      : 6;
  // Stablecoins show cents; BTC shows every significant decimal.
  const minDecimals = method.kind === 'erc20' ? 2 : 0;
  const units = Math.max(1, Math.round((price / rate) * 10 ** decimals));
  const amount = formatUnits(units, decimals, minDecimals);
  const ticker = cleanString(method.ticker);

  return {
    methodId: method.id,
    amount,
    units,
    decimals,
    priceUsd: price,
    rateUsd: rate,
    amountLabel: `${amount}${ticker ? ` ${ticker}` : ''}`
  };
}

/** BIP21 payment URI that opens a Bitcoin wallet with amount and label filled in. */
export function bitcoinUri({ address, amount, label, message } = {}) {
  if (!isBitcoinAddress(address)) return '';
  const params = [];
  if (cleanString(amount)) params.push(`amount=${encodeURIComponent(cleanString(amount))}`);
  if (cleanString(label)) params.push(`label=${encodeURIComponent(cleanString(label))}`);
  if (cleanString(message)) params.push(`message=${encodeURIComponent(cleanString(message))}`);
  return `bitcoin:${cleanString(address)}${params.length ? `?${params.join('&')}` : ''}`;
}

/**
 * EIP-681 token transfer URI: ethereum:<token contract>@<chain>/transfer
 * ?address=<recipient>&uint256=<amount in token minor units>.
 */
export function ethereumTransferUri({ contract, address, units, chainId = 1 } = {}) {
  if (!isEvmAddress(contract) || !isEvmAddress(address)) return '';
  const chain = Number.parseInt(chainId, 10);
  if (!Number.isFinite(chain) || chain <= 0) return '';
  const value = Number.parseInt(units, 10);
  if (!Number.isFinite(value) || value <= 0) return '';
  return `ethereum:${contract}@${chain}/transfer?address=${address}&uint256=${value}`;
}

/** The wallet deep link for a quoted method, honouring the method's network. */
export function paymentLink(method, quote, { label, message } = {}) {
  if (!quote || quote.methodId !== method?.id) return '';

  if (method.kind === 'btc') {
    return bitcoinUri({ address: method.address, amount: quote.amount, label, message });
  }

  if (method.kind === 'erc20') {
    return ethereumTransferUri({
      contract: method.contract,
      address: method.address,
      units: quote.units,
      chainId: method.chainId
    });
  }

  return '';
}

/** Public blockchain explorer page for the receiving address, if configured. */
export function explorerAddressUrl(method) {
  const base = cleanString(method?.explorer);
  const address = cleanString(method?.address);
  if (!/^https:\/\//i.test(base) || !address) return '';
  return `${base}${address}`;
}

/**
 * Human-friendly order reference, e.g. SSC-261126-8F3K. Pass a fixed clock and
 * random source in tests to keep the result deterministic.
 */
export function orderReference({
  prefix = DEFAULT_PAYMENTS.referencePrefix,
  now = new Date(),
  random = Math.random
} = {}) {
  const date = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const stamp = [
    String(date.getUTCFullYear()).slice(-2),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('');

  let code = '';
  for (let index = 0; index < 4; index += 1) {
    const pick = Math.floor(Number(random()) * REFERENCE_ALPHABET.length);
    const safe = Number.isFinite(pick) ? Math.min(Math.max(pick, 0), REFERENCE_ALPHABET.length - 1) : 0;
    code += REFERENCE_ALPHABET[safe];
  }

  return `${cleanString(prefix) || DEFAULT_PAYMENTS.referencePrefix}-${stamp}-${code}`;
}

/**
 * mailto: link that pre-fills the payment reference, amount and a slot for the
 * transaction hash, which is how a static site collects proof of payment.
 */
export function paymentMailto({ email, product, method, quote, reference } = {}) {
  const address = cleanString(email);
  if (!address.includes('@')) return '';

  const subject = `Payment sent ${cleanString(reference)}`.trim();
  const body = [
    'Hello,',
    '',
    `I have sent payment for ${cleanString(product?.name) || 'an order'}.`,
    `Reference: ${cleanString(reference)}`,
    `Method: ${cleanString(method?.label) || cleanString(method?.id)} (${cleanString(method?.network) || 'crypto'})`,
    `Amount: ${cleanString(quote?.amountLabel)}`,
    `Sent to: ${cleanString(method?.address)}`,
    '',
    'Transaction hash: '
  ].join('\n');

  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
