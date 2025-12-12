import { useState, useEffect, useMemo } from 'react';
import { ProposalData, DualProposal, EnvironmentalImpact } from './types';
import { X, Zap, TrendingDown, TreePine, Calendar, Shield, Plus, Minus, Download, CheckCircle2, Clock, Share2, Copy, Check, Loader2 } from 'lucide-react';

interface ProposalProps {
  proposal: DualProposal;
  onClose: () => void;
  userName: string;
}

function formatCurrency(amount: number): string {
  if (!isFinite(amount) || isNaN(amount)) {
    amount = 0;
  }
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function safeToFixed(value: number, decimals: number): string {
  if (!isFinite(value) || isNaN(value)) {
    return '0';
  }
  return value.toFixed(decimals);
}

function getFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);
  const firstName = parts[0];
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function inferProductWarrantyYears(component: ComponentBreakdown): number {
  if (component.productWarrantyYears != null) return component.productWarrantyYears;
  return 0;
}

function inferGenerationWarrantyYears(component: ComponentBreakdown): number {
  if (component.generationWarrantyYears != null) return component.generationWarrantyYears;
  return 0;
}

function getMaxProductWarranty(components: ComponentBreakdown[]): number {
  return components.reduce((max, comp) => {
    const warranty = inferProductWarrantyYears(comp);
    return warranty > max ? warranty : max;
  }, 0);
}

const TOP_BRAND_LOGOS = [
  { alt: 'Hoymiles', src: '/hoymiles_square_logo.webp' },
  { alt: 'Aluminext', src: '/aluminext_square_logo.jpg' },
  { alt: 'Solis', src: '/solis_square_logo.png' },
  { alt: 'Growatt', src: '/growatt_square_logo.webp' },
  { alt: 'Huawei', src: '/huawei_square_logo.jpg' },
  { alt: 'SMA', src: '/sma_square_logo.jpg' },
  { alt: 'Sungrow', src: '/sungrow_square_logo.png' },
  { alt: 'JA Solar', src: '/ja_solar_square_logo.jpg' },
  { alt: 'LONGi', src: '/longi_square_logo.png' },
  { alt: 'Canadian Solar', src: '/canadian_solar_square_logo.jpg' }
];

const EMBEDDED_LOGO_FALLBACK =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAA7gAAADrCAYAAABDyzqfAAAACXBIWXMAAC4jAAAuIwF4pT92AAAgAElEQVR4nO3dP4wb+ZUn8K/GY9j0wmbbJpg2J2bQPdHhFjx0KboFk+5JnKoELLDBBeIEe6lKwAEbikoOuEjs6DYTOyGwkaoBAr5s2AEvOmDYwOICgjiL3tmhvfZa' +
  'F/xeSaWebrKKrKrf+/3q+wEa80ct9hNFsur93vu936P379+jjlq97hGAUwCdO1+Q/9/M+ZA3AN7Jv8epf75bTeezfeMkIiIiIiKibB7VIcGVZDaASVyTf+ZNYA91A2CWfK2m87jin09EREREROQ1LxPcVEKbfJ1YDGeba5gq75hVXiIiIiIiosN4k+BKUnshX+eWw9nH' +
  'GsAYJtkd2w6GiIiIiIjINc4nuK1eN4S7Se1DmOwSERERERHl5GSC2+p1OwBCAANUv5e2arcwye5wNZ0vLMdCRERERESkllMJriS2EYAndiOx5gom0Y1tB0JERERERKSNEwmuJLYjAGd2I1HjBibRHdkOhIiIiNy26beToxMPERQQyjbDxmT5bve3kW2bfvsUwJHtOLZ4' +
  '15gsOdzVY5/bDmAbVmwfdALgdavXjQBETHSJiIjoQGPo3vZ1CjNzhRTb9NsBgLe249jhse0AqFxqK7iSvNVhj20RbgGEbF0mIiKifWz67QsAb2zHscNXjcmSwzcV2/TbCwDHtuPY4qoxWXKhxHPqEtxWrxvAtCNrfnNodQ2T6C5sB0JERERu2fTbY+g+lWINoMNWZZ02' +
  '/XYE4LntOLbg66cmPrMdQKLV6x61et0hTFsDk9v9nAH4ttXrRnIuMBEREVFWIUwSoFUTZusaKSP7bjUntwAQMrmtBxUJbqvXPQUwA/DMdiyeeA5gJtVwIiIiop3k5j+0HccOz2SfJ+kysh3ADldsb68P6wluq9cNAXwDVm2LdgzgbavXHbKaS0RERFlIEnBlO44dRjL5' +
  'mRSQ1uQT23FssYb+hRsqkNUEt9XrjgC8thlDDTwDEEuVnIiIiGiXELpblY/BVmUV2JpMGlkZMiUVxRi6V3t89PVqOh/aDoKIiIh0c2Sq8uPGZBnbDqLONv32DLrv5zk1uYYqT3CZ3Fp3CWCwms65kkVEREQP2vTbMcwAS61uAZyyOmcHpyaTVpW2KKeGSTG5tecJTMsy' +
  '964QERHRNiHYqkz3cKQ1ecDktp4qS3AluY3BYVIanABYcF8uERERPaQxWS6gP4HkVGU7tG95u25MliPbQZAdlSS4Ui0cwZxfRjo0YSq5ge1AiKharV73lF0cRJRFY7IcAri2HccO2pMtr2z67QF0t65zanLNlZ7gcs+tak2Yo4RC24EQUflavW6n1evGMEezsYODiLIK' +
  'obtV+UT2g1LJNv12B/qr+pF0H1BNVVHBHYPJrXavmeQS+avV6x61et0hgG+he9WdiBRypFX5uewLpXKNoLsj81q6DqjGSk1w5YaKN1NuYJJL5CF5Xy9gzsQmItqLI63KI9sB+IytyeSK0hJcuaniDZVbmOQSeaLV6wbSjvwaulfbicgdIdiqXEtsTSaXlJLgtnrdDrjh' +
  '31WvW70uD8QmcpTssx0BeAvdK+1E5BhJHrTf37FVuRwj6F4sZWsyfVBWBXcM3W8C2m7EI4SI3CL7bCOYs8afWA6HiDzVmCwjADe249hhZDsAn7A1mVxTeIIrN1gcKuW25Aihju1AiGg36bqYAXgOLi4SUflC2wHscCJJGR3IkdbkIVuTKa3QBFeqfs+LfEyypglgzLMy' +
  'ifSS82xjAG8AHFsOh4hqojFZzgC8sB3HDpEkZ3SYIXQvnN5IVwHRB0VXcNn77pcTsM2HSB1pRx7BnGeruW2MiDzlQKtyE7yHOcim374AcG47jh1C2wGQPoUluDJ9lzda/jmXtnMiUkDejwtwny0R2RfaDmCHM7Yq72fTbx9B/wLBC+kmIPpEIQmutLFGRTwWqfS81esG' +
  'toMgqjM59mcB7rMlIiXYquy1EXRfa9iaTA8qqoI7APd/+W5kOwCiOpJjf2KYY3/4OUtEqrBV2T9sTSbXfX7oA0j11tf2j+sdv34K3atbRVkD4Nm4RBVKdcY8sxwKEdEuIcxMAK3ONv32gOek7sbWZPLBwQkuTHLrepJ3AyCGOWZjsZrO46y/UW5CT2ESwAB+HpEUrqZz' +
  'fpAQVaTV6w5gklvXP1uJqAYak+Vs02+/gu4FuWjTb48ak+U724EoN4Luaw9bk2mngxJch6u3awBj+YpX0/neH3bye2P5gpwdewF/2rafrqbzse0giOpA9roP4edCGRH5LYK5/9F675O0KrMj7QFsTSZfPHr//v3ev1mqDC+LC6d0tzAfwONDktqs5GZ1AP0fFg95uprO' +
  'R7aDIPKdLIwNUe1nxeM83SpERLts+u0AZl6AZl81Jksu3N8hrckL6K7evmpMli4W1qhihw6ZcuVFdg1zM9dZTeejKpJbAFhN5/FqOr8A8AWAyyp+ZoFeMLklKpecZxsB+BbuLoQREQEAGpNlDOCV7Th2GEkyR5+KoDu5TYpURDvtneC2el3NbSiJW5gqZGCzUrGazher' +
  '6TwE8Bi7B1dpcLmaziPbQRD5TM4On8Ec+0NE5IsI5v5LK05VvkMq75r3TwNAyP3TlNUhFVztexheATjVVIWUim4A4CnMPmCNLiUZJ6ISyHm2MYDX0L9ISESUiyQhoe04djiX/aa158jU5FfSHUCUyV4JrgyXelJwLEVZw7QjD6pqRc5Lku4OgCu7kfzAFZNbotK9BXBm' +
  'OwgiorKwVdkpEXQvtrI1mXLbt4KrddXrBqZqG9sOZJfVdP5O9ud+BR3V3BvoX3ElIiIiN0TQ36pc63Nx2ZpMvvIpwb0BEKym84XtQPKQI3hOYXdvbvLc8QOEiIiIDuZIq/ITSfJqh63J5LN9E1xt0z6dTtBkCFUAO+08Tj93REREpJMkJ9q2Y91V11blCGxNJk/lTnBl' +
  'erIm3iRoq+l8gGoHUK0BhD48d0RERKRSCB1bsR5yjJolUmxNJt/tU8ENig7iAN4laDKAKkD5F4M1zMLArOSfQ0RERDXlSKvys5q1Kmvfe3zF1mQ6hOsJbuRjgiZ/plOY6nQZmNwSERFRJRqT5RhsVVZh029HAE5sx7HFGvoXREi5fRJcLW+K69V0rn0Fam8yLCtAOUlu' +
  'yOSWiIiIKhSCrcpWbfrtUwDPbcexA1uT6WC5EtxWrxuUFMc+QtsBlE1arwMUO2H5qUxuJiIiIqoEW5VVGNkOYIcrqfYTHSRvBfe0lCjyu3TtOKB9yXm5AYDLAh7uqezxJSIiIqqUK63KtgMoA1uTqU5cTXAj2wFUbTWdhzgsyX3F5JaIiIgsC6G8VVmSQW+wNZnqJm+C' +
  '2ykjiJyu6lK9vUuS3H1WPi/lCCIiIiIiaySJiWzHscNzSQp9MbIdwA5sTaZCuVjBHdkOwLIQ+QZPXUpiTERERGRdY7Icotj5ImUY2Q6gCGxNpjrKm+A2S4kiu3XdBySlBk9lSXKvmdwSERGRQiF0tyqfuN6qvOm3O9DfmjxgazIVLXOCq2SCcq2T20Qqyd12YbgBcFFJ' +
  'QEREREQ5NCbLBdiqXLaR7QB2uG5MliPbQZB/9jkH16bYdgBa7EhybwAE8j1ERERE6rBVuTybfnsA4Mx2HFuwNZlKkyfBPSotiuxmtgPQZDWdz/DDD4dbMLklIiIiN4Rgq3KhpDU5shzGLpFU8YkKlyfBtd6iIQkdpcie5Ffyn2sAF0xuiYiIyAWOtCoPJGl0xQj25+Zs' +
  'cy3Ve6JSuNSinGdycK3IEUBXMJVbLgIQERGRMxxoVW7CkVZltiYTuZXgsiq5xWo6v2ByS0RERI4KbQeww5kkj2qxNZnIYIJLRERERFZJ0vPCdhw7RMpblUdgazKRUwkuq5NEREREnmpMlhF0b0lT26rM1mSij1xKcImIiIjIb6HtAHZQ16q86bePoL81ecjWZKoKE1wi' +
  'IiIiUqExWc7AVuW8RtDdmnwj1XmiSriU4Fo/poiIiIiIyuVIq7KKvaSbfvsCwLntOHYIbQdA9eJSgntkOwAiIiIiqkRoO4AdziW5tEZak0c2Y8jghVTliSrDBJeIiIiIVHGkVXkkSaa1nw+2JhP9gEsJ7ontAIiIiIioGo60Ko9s/GC2JhM97PMc37soK4isWr3u6Wo6' +
  'Z5sDERGp0Op1j2BmRHTkK/nvRAfA8ZaHuMGn57wv8PF6O5Nfm62mc54FT3U1APDWdhBbnG/67YvGZDmu6geyNdlNMpisA3ONOMIPrxen2F6Rv77z38k1AgDi5P81JsvaXy8evX//PtM3tnrdAPY/YL5eTecqNvUTEe2j1etm+9At3+PVdB7bDsIlrV63AyCAuQlJvqps' +
  'D7yBSX5nyddqOl9U+PO9ouS+BgBerKbzqIwHTi3ABPi4CNPB9kWXRHIzPYO87mx9Zmz67SGAZzZ+dkZrAJ2qEotNvz2G7urtTWOyrPVw2E2/nVwjApj3XNVnFF/j44JpjJolvnkquBoEUDK1joiI/CbJwQXMtSdAtqSgTCfy9eHGttXrrmESkBhAzEULavW6pzCtoQEO' +
  '2951duefaPW6gFloSV5z44q6CyKY96Lt9+BDklbl0odOsTVZJ6nOpq8XtvdGn+Hje/c5AGz67Vukrhc+V9gzV3ABNZWHL7hiTUSuUvI5CrCCey+p0l7A3KC5OvvhCh+Tj4XdUPTyqYIrr9sB7CSBNwDGMK+30m6YN/12AB1/X9t8VWarsrQmz6A30QeAV43JcmA7iCpI' +
  'lTaE7sWXbdYw790YwNinCm/eBPcd7K9IvFpN57V44xCRf5jg6pOq1A7gblL7kFuYG5gRZ1h8yocEV/4MEapvf3zILUynXSmLKw60Kt8COC0rUaj7n18DqdSG8uViUrvNDUwnwrgxWS7shnKYvAluDPsfomsAp1yVJiIXMcHVQ1o5BwCe2I6lIqUmH65xOcFVmNje5wpm' +
  'YaWwimadK5iOVLAfNybL2HYQZZDW8AF0v+eKdI2Pya5zCxZ5jwlalBFETk1wHy4REe2p1eteyILtN6hPcguYpOAlgG9bve5YkiRySKvX7chr9y3032ifA3jT6nUXrV43lE6Jg8iNdnhwZOV6JsloYRyZmvzKt+R2028fbfrtcNNvLwC8gf73XJHOALwGsNj02yOpXDsj' +
  'b4Krpb3pvNXrhraDICIid8hN9gL1u1G5zzmAt0nyYTsY2q3V60YAvoV7r91jyI1yq9eNDk10JYl6VURgJRpJUlqUCLqr1rcwMXpBEtsIprD3Grqf+7I1YRaCv93023HRizdlcTXBBYChtJcRERE9SCq2C/BG5T7HAF5Lontw8kHFa/W6p61edwaZhOqwJsyfYdHqdQ9t' +
  '4Y1gtqxpdYyCEj5JKDTvuwWA0MU21vukEtvnsD93SJszAG83/fZs02+HtoPZJtceXEDV/jGA+3GpRmRa3xHM+Hng40HhgPnQedGYLKMtvz+AaWu7wT0HgwN451t7kUaKPkO934PryD5FbdYABqvpfGQ7kLK5sAdXqutD+HmjfQsg3PdzSPZEvik0ouIdtCe1znuOqyYJ' +
  'WwTdz7U2NwAGGu8d9zkH9xp6bhaaAMatXjeo6Bw2okpIMnqa+ipysmv6sT55L2/6bcDcdMzw8ay0Wh0OTu6TKuQQ9dpfW5QmTEU3gkl0SzvyhLZr9boj+P0aPoZpk7+CSXRzXWcak+V4029fQfeZsKNNv33IVOEIuhMu51uTpXgwhJ7cxiUnMBXda5hEV02n7z4J7hi6' +
  'XgQnAGImueQy+YBNDgi3/f46lq9zfDwc/AYfDwbnDS+pJa2PEfyseFXpGGZA0DVM8rGwHE9tyAJNDP+OrHrIOUzbcrjHgkoI006q9f1+DDN5N8r7G9maXC6pjkfQ/xy74AzAN5t++xWASMNrIu8eXOBjS6MmJzAfjtyTS87Y9NsXMpnuHcw01+ewn9w+5ATmIvBm02+/' +
  '3/TbY5ks2LEcFxGAT6bLvoTem10XncFMXY5sB1IHNUxuE02YRDAXR6YqP5dF7Ly0nxhypbE1NQtZPJiByW3RnsFMXb6wHUjuBFcOir8tIZZDNWEqudafVKKH3Elq38C0n7l4M34OM7AnmaoXFjwxkigzqdrOoHeByAfPW73ujAvJ5alxcpuI9vlN0lV0VWwohRvl+WYZ' +
  'dKT5dbCG/oWFe2367SHM3nvNrd8ua8IUQ8Y27wv3qeACpk1ZoyZMS5X2VS+qkU2/3dn028PUOWquJrUPSc5K+50k74HleKgmWr3uUavXHYNV26okW4KcHyijDZNbXB849C6E7qnKJ5K07iTVXu0Ts51rTd7026ebfptV2+qcA5jZuifcN8EdFRlECZ5xpZls2/Tbwabf' +
  'HsOcW/gM9VgtfAJHRsiT2+TzfQbdA2Z81ATwstXrjnmkUGHqntwCBw4q8qxVeVR2IAe6cm0Wh9yPxKj3e8yGY5h7wqjqH7xXgittyjcFx1K0EwDf8Fw/qpq0685gWmDqevN9AuD1pt9+t+feI6IHydEp36Aei0ZancNUc/n+Ptwz1PvG+9DqLQA/WpXZmly8Tb89guky' +
  'Y5ePPc+rblnet4IL6N/8nngOYMa9uVQFGbr0GrovUFV6BzPhkqgQcnTKa9txEICPLcu8vtIhiryfHMDRVmW2Jhdr028fSbHB56O2XHIOIK6q6LF3giuHwGv+EElLjjuI5WB3olI0JssFgEvbcSiiYlw8uU/228bgzYo2yeyL0HYg5KTbIs9almtwVNTjleT5AycQjCqO' +
  'Iy9nWpMliYrBYoM2J6goyT2kggu4U8VNnMEcKj5q9bod28GQtyK4s/hTptvGZDmyHQS5LzWAh1OS9XrNAY+0h6joB2xMlkMA10U/bsFG6f9ga3JxmNyq14RJcsMyf0gRCa6LN/JPYM71Y6JLhZMVZN7oZbhxkWOTOuWHQq6SPZ4xeLPigmfSQk6Uxa10A5YhhO7707NN' +
  'vz0APmxt0t6aPHChG0sm9sbgflvtmjBzWsKyfsBBCe5qOn8H/a0g2zDRpVxkMvIow7e6uvhTlJ3VWxk2MIIZI89jR+gHmNw66QmTXMooKuuBHWlVjiS5HVmOY5drF7qxJFl6Cya3LiktyT20govVdD4EcFtALDalE93AdjCkjwwrSA4Hf7LrDSkrnXWu4oYZvmcAcyFq' +
  'Ani56bdjVnMpkUpuebPiHia5tEuZ1VsATrQqN2GOOtO89cKJ1mS5J+PwQTeVkuQenOCKsKDHse0JzB7dmAMzKCH7Oe4eDh5l+K11reJeNybLeNs3SPX2btX2DKaaG5YUFzmCya0XnnBPLm0RVfRzQui+Dmv/jIukGq4Wk1svvN7024VO4y8kwZXzy7SfPZbHGczAjAXP' +
  '0a03aZ2977zN44xV3Dq23kYZvmeI+y/syb6MUZXnpZEe8nk7hv4bP9rtGReL6R6lV28TjrQqa3UtVXC1pADB5NYPoyKnKxdVwQX0r5Lt4xhm4//v2L5cL9KSPAbwcsu3RbseR/atuN7Cn0eW6m0Hu496eYIKz0sjHVLTku8uKJG7XvOcXLojqvKHSZJ2U+XP9ID61uTU' +
  'tGTyQzJduVPEgxWW4MrAqbCox1MoaV9etHrdAau6/kp9aJ7v+Nbjhw5svyPL9/giS8U6yvhYyXlpvDmujxgcKOWjkbSdE1VWvb0jtPAzXaa6NVmSoBjs9PFNE8C4iA6+Iiu4kMO6L4t8TIWOYap6C6nq8qLtkdSI+aw32YNdb8QaVXEvG5PlbNs3ZKzepjUBvOGUZf/J' +
  'UCImt35qwiS5XBimkY0fKtemFzZ+toNUtybLPRe3sfjrBAUMaS00wRUD1KMVpAlzo/5Nq9edtXrdkBdvt+05Yr6JbFXLcI+QXBNl+J7Rno/9MuPxTOSgVq87QL6FD3LPCfQfh0LlWsPi6QKNyTJCPe5PD6G+NRnmc4SLoX57cmhho/AEN9Wq7Nt+3G1OYDa5J1XdjuV4' +
  'KCd5I+07qCBLFTeG7uMKDnW5q51JquOHHIfwZNNvF9K6QnrIbINte93JH+eymEH1NJR7RJtCyz9fu6Hy1uQIu7ePkR9eHjKHpYwKLlbT+QxAHffNJVXdb3nUkDukMnjIDXYT2aqXWb7HRWtU9+c/h9mXyyTXA7IYOLYdB1Uq4taeWrJavU2wVXmrG6lyqySL5M9tx0GV' +
  '2vtEjVISXODD0UFPy3p8ByRHDb1r9bpDVnV1kuS2iNbIZ7smv3lcxd254ltA9TYtGT7FJNd93EdVP02wVbmONFRvAbBVeYvQdgAPSe27pXo5wZ7FkdISXACQSXmvyvwZDmgCeIaPVd06VrZVKjC5TUQZvse39rysq/JFr9wzyXVcq9eNwH1UdXUif/9UDyqqt3eEtgNQ' +
  '5sWuIZGWcTG0vp5JkSSXUhNcAFhN5wP4P1k5qzMAb+SooYhVXXtKSG4Bs0e0s+0b5ALi0/th2Jgst67Ky/CuMhIZJrmOkn23bDWrtwGvgbWhpnqbYKvyJ7S3Jg9QXAcYuSn3AtnnZURx12o6D1u9LsApmYljmJu7561e9wrmwz+2G1J9yIdlWa/FIXbvP49K/PlVyroq' +
  'H5UYwwnMym5Q4s+gAsm0+ZHtOEq0BjCDOW5sBuAdgNm2G3xJ+AHzOu4AOIX/1e2kVTmwGwaVTGP1NjGEqeQeW47DttB2AA+RIUM+DyG8hblOJNeMZDvbvWRB/xRA8s/ky/fX8Mmm347yLMQ8ev/+fYnxfErOOfThxr4MtzAftiNtK50+kWrivtOSs3q87QNK4hih+PfC' +
  'i21vfmnxeFvgz3sqZ/w+qKLnGzBTnMMKfs7BWr1udR+62z22sbDW6nWHMNs2fHIFc3MSy5DFg8lCQACzYHYBf9vzrLwOgQ8LC0V+JtIPvVhN55HtIB5SwnXRNVvvG2zb9Nsx/KrermEW5WMAcVETq6V7MIC5Vvg6ZXoNoLOrazBRaYILfNh3xda0h61hVrWHq+l8YTcU' +
  'v1R4IbtuTJbBjlg6MCt2h9y03sBUh2L57/G2PTSy8pfsAU5WAPe9cNw2JsvOtm+QnzdDdSuLrxqTpfo9znVOcD1LKCpdlJT5DSH8u3m5XU3nHRs/2LPXY2KNj90DSQfBfU7xsVugzATiC+33Mpt+28dFtyxuGpOl2onm0m3nS/X2GsBoV1GgCHLvdQFzv+dbJ1DmYkbl' +
  'CS4AyPE5VVR1XMf25YJIm0uM6qogWaq4EbIv9iSrfjMAs12PnYc8N6cwq38BsiWkWaq3EapfzNoZl201T3BncP+Cew0gslh17MAkugP4U9V9KkMpK+VRgpssjI/27SCQ5yLpFihqUfJyNZ2HBT1WaSwsxmrxpdbBUgUVATS4BBDZOltY7u/K3JZnwxdZnk8rCS7w4cOU' +
  'U9GyuYZJdDkifQ9y8YpR7Y11liruEYAFHn4P3MC8R7ZWZosmF5YLmGT3vmpR1urtAtW/v9cAAq0XbaC+CW6r13V9Nd5qYnuXtDAP4Eeia6WK60GCu4b5+x8X2UUgz0uIw2+K1VdvEzVsVVbd8bTpt8dwu1vFamJ7l9zXRfAj0c1UxbWW4AIfVqLHcH9Fvyq3MDdYI9uB' +
  'uMTiB+U+Vc4PLeoaPhhTye4AH1e3i65OF+0WwGnWfRpVq2OCK8nYAm4mYrcAQi2J7V1yHR3C7ZtBwEIV1/EE9xXM/UBpn3MHdgs4Ub1Nq1GrsuprpOOLDdcAQg33b/eR5zaC+/uad1ZxrSa4wIcbnyH8WFWoChPdjCzv4chT6VzAJLWj0qPak3wwXuxa9bVYvU3bWUG3' +
  'paYJrqs3jqoH5KRJsjaCu22WlVdxHU1wK19wkfu0CPnew85UbxM1alXeuUht06bfdnEryxomsXWi01LujSO4uegMZKjiWk9wEzJAYwR3n2wbmOhuIXsPvrEcRpYq7pHWldR9lDQheh9fNyZLdcdT1C3BlSrQt2X/nILdwCQRalvd77NnIqJJpVVcBxPcGwCBrZMWWr3u' +
  'KUxBYlf1x7nqbcLx6mEW2luTQ7g3o+cKJrl16j5OOvRGcLeau7WK+1mFgWwl+0tPYcr7lM0xgNetXnchg7voUxpW0qJd3+Dah+I28oGpIbld4+HpoVStyHYAOV3CJBFOJbcAsJrO362m8wGAr2DeA66JbAegWPK6tPa5tprOZ6vpPADwNba/vqJKAiqBVDYvbcdRklvo' +
  '/7uJbAeQ09eNyfLCxfu4xmS5kE63F7Zj2VO07RfVJLgAsJrOFxk/POlT6UT3wnYwioQwH+g2Hct+1LqIbAcAs5p6qrnduy6keqthwSOrp6vpPHT9LPLUgvGN7VhyOpaqKn3qRtPrcjWdD2GGEN73+rp0rTX5HgP4eQ+qusoo1VtX2sPXMFOo1XWJ5SXnID+Ge6/5C9lW' +
  'cC81Lcp3yY3RCO6Wzm1SNe3TNssDj4Cch1PnJS1VRzA3tGlH+GEVcyFfs6LjkQ+a3xX5mDk5sQemTi3KrV53BDcS3DUcrdpuIy3LI7g1gOpqNZ1XslDrSIuy1bbkbeT1Ncan92nO7b29z6bfvgDwxnYcBVLdmgwAm357ATcS3BuY0xrUvScPIdv6RnBr//ODW9HUJrgJ' +
  'qUgO4caLXpsrAAMfLjaHsvzGXcMMZ4oPfSD5cwTydYrD3hdrmIEaMYC4oPgC2Bl0cwlg4MIFpy4JrkN7b71MbtMcWmhIVJIkOZDgOvHaTL2+nN17ex8PjqpJqJ6aDDi199bL5DZh6VjNQzw4zFVVi/J9Uq1WrvaI23QO4NtWrxvJSmttNSbLWWOyTF5HVbZhJB+G8b4P' +
  'sOm3Lzb99khWN7+BmQp9jsOTyCbMyvtzAG83/fa7Tb893vTb4ba2j23kz3kKs7hShVuYiZCqW69qKrIdQAZOJBCHkqTDpX2F3GpjRC68NuX19TXM4qZPQrjXtnkfF66Pke0AMvA6uQU+zIQJ4M72lmMp/PyA+gpumkfn/dmg+izHKlU4OW7vyXoSYyhfNroX1jCtZ8PG' +
  'ZLnXDU9d5toAACAASURBVFYFRzS9gjlI3amLTR0quI5Ub2uR3KY5VMmt5Mgg5RXca5lJQhZ50Kp81ZgsVS8YOVK99T65TXOsknvvkUHqK7hpMoTqAmYzNKct53MM4G2r1x2zmvthclyZw8xe7DNZb9Nvd+SYnW9hKqu2WvObMDfC32z67Vhaj3ORfRFlTHO9ganaOtGS' +
  'XFOh7QB2qF1yCzhVyT2WI2nqTPV+ybqQmQ5VdSQVbQ39n8WA/hhrldwCzlVy713AcSrBTaym81hWNpno5ncOwLtpy/u01EoC1kHxF6+nMpUuszuJrbYKyxlMC3PuRFduDgIUl+S+aEyWp/u0fG/67ahmE61t0n5zXrvkNiFJrgvXzdB2ABZd1vX1qVQIN1uV1bcmS3up' +
  '5mGyt6hZcptIJbnaX/tN6bT4hJMJboKJ7t6aAN60et2hR9Xcsewf7eT5TY3J8p207xRVaXya93gaSbpm0JfY3pUkuuM8CwrS4hzgsOf3GmYkf5T3N2767UD2Lz8H8Dzva4TykTO5m7bj2OIpkwdcQP/KvFeLsDlFtgOgj+RGX/ui3V1X2k8UEJqf12RAaO2S24RDSa5f' +
  'CW6Cie7engGIXW8Fk/0bZzDV6Zns/cxFLgQdHNa+lyu5vZN4aU4I7joHsMjzPB+Q5K5hxsAHefcCb/rto02/PYTZY5du9Y5yxkD5hLYD2OJyNZ2PbAdhmxw5E0L3Tcux7OWum2uefKCPXNtdub90ojVZFso1L2QN9p1B4hN5DjQvRAC+JriJVKL7JdzYZ6TBCUySG9oO' +
  '5ABR6t+bAF5KO20nz4NINTeEWSi5zRlD3uQ2wg8TL5ckz3Pmau4eSe41zNEGuQ9Sl3aVGcwizl1PWMUthyQkWtvNbqD/Il0ZqWJrfz403/yWZWQ7AHpQCN2LQgn1rcniAnoX9y/zduP5TJ4LzXlV8+40Za8S3MRqOp/JPqNfwhwLkzdZqZsmgNetXjd3ImGbVG/vSxLP' +
  'AHy7z57L1FE3rzL+lszJrVQVY5iqrQ+SqnmmLoCMSe4a5jkNGpPlIk8w8vyOYaZebls8iPI8LmWmOSEJpXJJQqrZmgfoaH49lWHNDgO95HoUWQ5jF1dakwG97+9b6F/8s2EA3fnUJ68nLxPcxGo6f7eaziM5buAp3GkvseWZg1OWwx2//nzTb2dOwBJSzR3AVHO37VXL' +
  'vMonMcygt8K1r2MAsSw27LSj3eUKQGeflVP5+QtkO0aMVdxyaL0peMF9tw8Kobcq5dtn5S6x7QBoO+ko0nov6URrMvDhKEStR366UgGvlDwnoe04tgjS/+F1gpu2ms5Hd9qXtV7QbTuHaVlWn+TKRN8sN0AnMMfdRHmnLTcmy7gxWZ7CdALcdXPf2Vv3keQ2hrstybs0' +
  'AbzOkeSO8OlzegvgqwOOVophztHL0+4U5vk5tJ3s5df4+r5ZTeeR7SC0Su3HVUnOqq0LVypvdRdC5z2kS0fnaa3eXu5zSkNdyHOTtbuxap/kA7VJcBOp9uUOzDmomsvttpwAmDkwfCpvteg5TDttkPcHyfTeL/Fx5XaNO6tFD5H9oDH07jUp0ms57mgneU6vYT4sT/dp' +
  'q5JBV/tWxQf7HC9FD9J6w6K1qqzGajofQ29VKrAdQIVi2wHQbkpbla8d2zOq8XqxBq8XWUTQucCD9P197RLchLQvD6V9+TF070Oy4RiKJywf0N5yDHPUzXCPau6sMVkGMAsjmSqN8mZ7g3okt4knMr14J9lnm3vVedNvn2767RmAl9j/uW1C50XWVRqfy6vVdB7bDsIR' +
  'oe0AHhDYDqAit5ye7A5lrcrOtCYDH6Yna9x+MHSoAm6N8mOzguRfapvgpsn05QsAX8C0TapcmbCgCb1Jbnjg738Gc9RN7pvyxmQ5zNLCIm3JdW05e5a1XTkvGRz2DUynwaG0fkg7RaYnF/H3UTT+/WYkyZXGKZkab4TLsLAdAOUW2Q5ARHkHMlqmcTH0VrrKKAPpFtDY' +
  'ARsk/8IEN2U1nS9kKNUROJQqoTXJDQt4jCaAN3mOuslKKswx6lW5vSvzntws5NzgGYqdQH2SdwAZ3SuwHcA9LlkRyy2yHcB9FF5/yhDbDoCcdL3PUXqWBbYDuEdkOwAHRbYDuMeHawUT3AekhlJ9AbNHsM5V3STJVbFfUaquRQ6zOYep5oZFPJgky2PUO7lNDA9NIOXo' +
  'nyHMucFlVAnDEh6zbgLbAdwjsh2AaxRXceuQ4C5sB0BOCm0HsIfAdgB33Dq2f1kFpVXcZnJCBhPcHaSqO4AZSvUU24+M8ZmmJLeM9pZkCnBcwPExQ+hs17ShCWDvCrnsYZ7BtJSXJSzxsesisB3AHaze7i+yHcA9mOAS3cOx1uSku03btH3XKuCaRLYDuMcpwAQ3MxlK' +
  'NVpN56eo71FDJwBGtoNAufs3zmAmLe+1d0+qwE8Kjch9x8h5AZGq7Rimalv2xbC5z15sMmT/rbYblpHtAFyltIpbhwSXw22oDgLbAdyxBq8Xe1NaxWWCu687Rw3Vrap73up1ra12SSJSdutvE8DLTb89y9NeKyuTXAm835OsSaR83wLVHgLPBHd/ge0A7rjh5OSDafsc' +
  '8z7BXU3nM9sxEFUgsB3AHWNOTj6YyusFE9wDPFDVrYNnrV7XVkJQ5c89AfBNjmruENx3u80oY6vyANU/j0HFP88n2pIPbRdb50iypWnhlp+rRH7g9cI/I9sB3HEEMMEtTKqq+0uYc1K1leyLNpLWxKrZSKx3JmVSdayy4uiiJrLt18jyPUU75jTlvQW2A7ijrkdzFU3V' +
  'jV+r1w1sx0BE+5MFbk3zSW4akyU7Jw4kFXBNBb4zgAlu4aSqO1xN5x0AXwG4shxSWZqoeNVGEhAbK/mjDN+j6mZQsWe7hnjJGcM2qkdsU96PphuWy9V0znazYmhbKNAw4JCI9qdtEXlkOwCPqLpebPrtIya4JVpN5+PVdH4Bc9SQj0Opzlq97l7DmPZkIwG53DWlUAZL' +
  'aRuyo1mU4XtsLBgEFn6m0xSeTxrbDsAXslCgaYFW22uNiPLR9h5WlZS5rDFZjqErxzllglsBOWoohBlK9QJ+tS9HFbYqBxX9nLRRhu+JSo7BN08yVHFHqP7D8qzin+eDju0A7uANS7Fi2wEQkTc6tgNIuXHtiCUHxLYDSGOCWyFpX46kfdmX6ctNVFdtqzoBuZV22Qex' +
  'eru3KMP3VJ6syLm7lJ2mFflrticXTtOCQWA7ACI6iKbrhabPNl9oek4DJriWpKYvPwZwbTueA52XPQDE0gCgLIl7lS3aPtlZxQXblF2g6YYlth2Ab+RMXJ86jojIHl4v/BbbDiCNCa5lq+k8Xk3nAUyiq2kKWV5RyY8flPz499m6GiVJt6YBO64Jt/2iTDes+uZa0wXY' +
  'BZoG/8S2A/BUbDsAoem1RkT5qTnua1d3HuUnLd9aFkQ5ZEoLSXRDmIFULlZ0z1q9blji41edeNxm2J/B6u1hwgzfU3XLCxPcfNQ8X6vpPLYdg6di2wEILiYSOUrZMXwu3mO7IrYdgOCQKW1kIFUAN1uXoxIfu1PiY98nS2LFY2UOk+Xs2biKQFKO5aw+ykbLirwP8wy0' +
  '4jmRRHQoTddVfqaVR81zywRXqVTr8lPoGr29zXGJe3GrHjAVb/vFTb99AT039y4Lt/2ijJ6vmqaVZrUqnJ6excJ2AL5aTedqbliIyFkd2wGkLGwH4DE11wsmuMqtpvMRzAeDpvMIt4mKfsAMw4gKlyGxCqqIowaCDN9TdScDE9xsOrYDSFFzUfUUK+REdIiO7QBSeL0o' +
  'j5rnlgmuA+R4oQsAX0F/NfeshMpO0Y+3S5abuaDsIGriJMMCRlxBHGmaWqkoGzUXVU+pOH6p1ety8YmIDsXrRUkak6WKawW4B9ctq+l8DJPsad+bW/TwpapvarZ++MkeTQ48Kc6uv9+qL0ZBxT/PVZoWArRcVH2l5YZQ02uOiLJT895VlIT5SkPHT5MJrmOkmhsAeGU7' +
  'li3Cgh+v6g/GXTdzrCIUK9jx64sKYqD8NL0PFrYD8BxvCInoEFquF1qOsfGZiusFE1xHrabzAcwAKo2arV63yAnDqiq4YIWvaFv/fuU83CpVPdCMDrSazhe2Y/CcihsWIqIDLWwHUAMqrhdMcB0mA6i0JrlFJrhVV3AXO35dy0qkL7I8nxpaXojqSkuLMhER6abiesEE' +
  '13GKk9zAdgD7akyWix3fomYviSeyHLekYkWQiIiIiHT73HYAdLjVdD5q9boA8Np2LCnHrV73tKAzFN9B12AtVnALtum3g8ZkGW/5lm2/VrhNv31qoTWa9qN9sjwREenAxfKaYILrCUlyTwE8sx1LSoACWhUak2WR7c5FyFJxpAI1JsvIdgykFhciiIgoC14vaoItyh6R' +
  'wVOa9ioGtgMgIiIiIqL6YILrnwvoadnzrpV30293bMfgKe9eK1QZTr0mIqIsAtsBUDWY4HpGjssY2o5DHLd6Xd8GMnVsB+Ap314nRERERGQBE1wPrabzCHoOs2ZljoiIiIiIKsEE11+R7QCEbwkuJ/ARUd0EtgMgIiInBLYDAJjgekvOx9WwF9er1lMeHVOa2HYAlJua' +
  'xR6ZIE9ERDppuV7wWlETPCbIbyPYPzaIHyYW/P79I8z/vdi39y8evUf3R38u9DHJaZoWe7xaSFOoYzsAInLaDMC57SDAYx6r0LEdAMAE13dj2E9wD77x3PTb74sIJKPbxmTZqfDnFe6f/vwT/Jfvf/7HP+LRT2zHksNb9Lq2Y0h7vJrOY9tBUGanYBdAmTq2AyAiKsKm' +
  '3z5lN16pjm0HALBF2WtKbtA7tgPIKcsbU9NZwx/8/v0j/P3m56u//f4XcCy51YgXv920tJwBrOCWjZ04RHQIXi9qYNNvq7lWMMH137Xln1/ESk6lf4ZNv73rw0/TBzUA4Ld//jH++rtfr//xTz9t2Y7FB6vpXN3fsTar6VzTIkBgOwBfyVFvbOsjokPwelEPHdsBJJjg' +
  '+k/Th4ordq1AxVUEkUVStf3N90dYv3/Em1CqKzWrxh7ic0tEPuFnWnnUPLdMcP3nQyWq6j9DZ8evLyqIYaff/vnH6H33q39h1bZwWs6QdoGWdv1mq9ft2A7CU4HtAIjIeZqKLWqSMA8FtgNIMMH138J2AAWo+oOxs+PX4wpi2Oof/vhX6998f4Tfvf/s57Zj8dDCdgAO' +
  '0bSAxpuWcvB5JaKDNCZLTdeK402/3bEdhKfUXC+Y4PpvYTsABwXbfrExWS5g6Yzh+b9/jv/w3a9X//2PP2M7cnk0XYi1i20HkBLYDsBTge0AiMgLtmfCpAW2A/CNDJhSc2/KBJdcEFf8884yfM+49Cju+Ic//tX6b/71l/i/f/mMLcnl0tRKpZ2mxYAL2wH4ptXrBlB0' +
  'w0JETtN0vQhsB+AhVddgJrjkgso/FDOMOo+riAMwVdv/+N2v/h+rtpVZ2A7AIZoWA465D7dwqm5YiMhpmq4X/GwrnqrnlAkuqWfpQO5gx69XUsH9H//2sz/8zb/+Ev/8lx/9qoqfRwCY4Oah6YYFUHaB9QCfTyIqiqbrRVPTma2ukz3NJ7bjSGOC67/AdgAFqXpa69Yb' +
  'OxmYcFXWD//nv/wI//lff7n6b3/4q5+W9TPofqvpPLYdgyvkvGBNU6dD2wH4otXrnqKYc8yJiABdCS4ADGwH4BF1i6FMcMkVi4p/3tmm3z7a8T2lVHH/x7/97A//6btfff+///1z7rWtnqZkzRWablpO2KZcmNB2AETkD5sDOh+gLilzWGg7gLusJLitXveo1evuSh6o' +
  'GL48zzZuondVcUco8MM6XbX9M/Czoh6XctGUrLlC23PGVflihLYDICLvaLpeNDf9dmg7CNdJq7eq9mTAQoLb6nUvYKpxlU+hrSlf9hjEFn5mmOF7hkX8oP/5p59uzr775R9YtbVO08XXFbHtAO4IbQfgulavG4LTk4moeLHtAO4IbQfgAZWLypUluK1et9PqdWMAb2Au' +
  'nGdyBAGVq2P55xdy7lljsoyLeJyczjIcBn5Qgvv794/wm++PVv918/PGv+ER99vaF9sOwDUK9yw3JUGj/am8YSEi58W2A7gjy30ePUC28j2xHcd9KklwW71uBFMZuXu+6KiKn19X0gbu05CQqgdNATtW92TY1OU+Dzz500++//Jffv2H3/75x6zaKqEwWXNFIQtZBYps' +
  'B+AqWXhW125GRO6zVKzYJbIdgMPULoaWmuC2et2g1evOADzH/e1Ox5L8Ujk0tCcvCnysuMDHyirLm3eAHHtxk6rt321+8TNWbVXRlqS5JLYdwB3H7BDaW2Q7ACLymrZr7RNWcfOT6m29ElwZIjUE8Ba7V4IHchwBFU/DhLhFgY8VF/hYWe0cQiBV3Eytyv/055+AVVu1' +
  'YtsBOEzjTIXIdgCukUWBu51WRERF4vXCDwMontVQeIIre58WAJ5l/C1NsFW5LIHtAFBggtuYLG19KEa7vqExWUbYcsTM798/wt9vfr762+9/AVZt1dJ40XXCajqfQdfxD4CZ8xDaDsIxhQzNIyLaIrYdwD1Yxc1Bniu11VugwAQ3NUTqNfJn9CdS8aWCyFmQGvZRLQp+' +
  'vKuCHy+L44yj5O/9nt/++cf46+9+vf7HP/2UVVu9biVJo/1pXCCIbAfgClkM0HDNICKPNSbLGXSeOR/ZDsAhERRXb4GCElzZR/stDmttesbV9kKFtgMQRScNNm6ib5HhzyHDE14l/51UbX/z/RHW7x+p/iAglSvKrtGY4HLOQwYykJCLzERUFY3XiyebfjuwHYR28hyp' +
  'nJycdlCCK0OkFjBDpIow5H7cwoS2A4Cpir0r+DGr/lB8BeBUVhyziADcsGrrHI0XW6espvMx9LUpA2bOQ8d2EMpFUL4aT0ReGdkO4AFc6NvNiedorwRXhkiNYIZIFXkMTRPAWFaTaU9SCddwPNCi6AeUgU5VtCnfAnjcmCwH8jMzaUyW7x5/96v/xaqtU9aSnNHhND6P' +
  'nPOwhQyWyjozg4joYIrblE82/XZkOwit5LlxYitL7gQ3NUSqrPL0MYCYSe5BItsBiLikxy37JvoKpmob5/lNrV73tNXrzv7PX370d+WERSXRmJS5SutzedbqdVUPxLBBrrMj23EQUS1pvV483/Tb7Ca9Q56Tojp2S5c5wZWb9xj7DZHK6wTcE7cXuYnTUL0Fyk1wy2iF' +
  'XAP4qjFZXuSp2gIf9qF/A0dWtugTTrTbuEAq4RpX5QEg4haYHxhBz/WCiOpF87V3JOe8Ej6ceat1QeJeOxNcaUeOYG7eqzwf70TaoCkjWY2PbMeRWE3ncRmPK8ln0W+0KwCdvEcRJVVbOLSqRZ/g9OTijWwH8IAmgBG7gwxZDD23HQcR1VNjslwAuLYdxwNOoDsBr9oI' +
  'ji2Gbk1wZW+OzZv3J0xycxlBz6CQsj+0ivrgOaRqOwCrtq7jBax4I9sBbHEC3fFVQirZL23HQUS1N7IdwBZPNv127be2yL5b5xZD701wpWo7RvFDpPbxpNXrcvDUDgpX4+MyH1wGFNwc+DD7Vm2TM595g+i2NXRfXJ20ms4XsHNedVbndV44leQ2th0HEVFjshxB5/T9' +
  'xMtNvx3aDsIW+bM72aH4gwRXEqUFdCVL5+DgqQcpXY2vold/3+rboVXbGapt16dyjEs4xooM7ZXxJ3U8d12uoWPo6fQhItJ+vRjWceiUJLevbcexrw8JbmqI1EvovPidwCS5HduBaKJ0Nb6SfY2y8pd3oE0RVVuN7w/KL7IdgK9k//2hHRZle12nJFeS2xj2u7KIiNK0' +
  'J7hNAHGdklz5s2r/e9nqM2lHHqL6IVL7OAEwk73BtZc64kFbwlXlpLVRxu87pGobglVb31xKKy2Vx4WLYy2S3FRyy3kBRKSK3JNd2o5jh9okuZt++wLmeqEtt8jlM5gbd5cOeW8CeFv3Mw2lcjuDzhuWUYU/a4jd+zf2rdome9GrOBqLqhXZDsB3q+l8BL1HBqW99vl6' +
  'IteKBXReK4iIADeuyUmSG9gOpCzSlvwGHtzzfgbHzjVKeVnX4VOptmSNrWY3VR67Iit/D1WKDqnaXkDfXnQqBqu31YlsB5DRSx8HT0m3UwwPblaIyF9yZJD2Ki4gRTYfB0/JtGRn99ze9RnMDYjmCWbbnANYSDJSC6mjabTesNhoS7yvinuNw6q2Xqxg0b0i2wHUhUNV' +
  'XMAMnvJmmKFcK96Cn2NE5IbIdgA5vN702y5sw9lp028fbfrtERydlvyQz2SKaGg7kAM0AbzxvZrryNE0a1joCJDqbNJiuAbwdWOyDFi1pXuwelu9yHYAOZzBLJoGtgPZV2qRTvO1gojoEw5VcRPPNv32bNNvd2wHsi/ZUxwDeGI5lMJ9BgCr6XwM3ecWZpFUcyPbgRRJ' +
  'blYiuDHkaGjr2BWZqHwJ4LQxWeZaVUsNWmPV1m9rfFwIoYpIFVf7ROW0ZM7D0LVFUy7SEZHjBnCrq/QEwGzTbzt3byEtyd/A0/kM6XNwQ7j1orpPE8DzVq+78GEyZmp673O4kXiNbP7wxmQZygpgZlKpcW3QGu3H2gIMObmw8AyOTO2XDh9urSAip+2Yq6JVE8DLTb8d' +
  'u1DN3fTbwabfTnILb31IcOXGz5e9rMcwkzGdS3Slmjho9boLmM3eGgdJ3cep1s9U1fYt3HmOaX+3q+k8sh1EXcm5uC52CR3DVHPHGs9gv9Phw6otEflgCHdmN6SdAfh2029Hm35bXffPpt/uyF7bt/C0apuWruAmNyGv7IRSinSiG2m8QUm0et0LmeK5gNk75VrSFdkO' +
  'ICtWbWsptB0AOdd6lnYO4NtWrzvSch1xsMOHiGinO3NVXPQcwEJLoitDpCKY64V3e20f8vk9/y8CEMCv7P4Y5gX3vNXrXsEMQhrbbFeUvV0BTNX8Am7foLxwpXor1Q6v2zLoBy5l8Y4sWk3nC+macPn99wRm2vIlgFHVrytJrkOYmz+XrxlERA9qTJbjTb99Df2zZx7S' +
  'hLnWDaRqOsy7he5QMkBqgBoltWk/SHBX0/k7WRmO4ecF9Fy+Xrd63WuYZHdW9o2K3JicwiS1AfxZQFjDgf0ScnbwCP4875QNB0spsprOIxmE5Pr7MEl0b2E+/8ZlLfLJYmiyEMo2ZCKqixCm6uhyLtKE6RZ8Jgn7CMA47ykfWcke4AuY58716+xB7qvgYjWdz+QMPW8O' +
  '/H3AmXyh1esC5uzUGUyb8AzAu9V0Psv6YKlhJJ07X66uQGURaR/cw6ptrV1of33WUAgzudEHxzBbSl62et0bmIXhGGbRdLHvg8q1JPny+fpBRHSvxmS5kNZaX448S3KO15t++wamwBYDmO2b8EoLdAD/imcHe/T+/fsHf1HaybhP8aM1TOJ7BL6IAOBmNZ2f2g7iIVI1' +
  'H4N/V3X1ajWdq6vetnrdhz90q/XYVut2TRadkuvFQr4g/52+kQnu/DuvLdsV+pqVhYS3RT3eIVbT+SPbMVA+m347gOXXT2Oy9P51s+m3Y/i/0HeLVHFN/l+c+vUjmC7Q9L934N68nsrcW8FNrKbzgVwAeME1mvD/TZZHaDuAbWTP3wJ8/dbRjcbklgyPWpW3Sa4XvGYQ' +
  'Ee0vhPutyrscy1f6euH7InCpPtv9LQjg5rhuKteLPO3bFoXg67du1lC++EIAzD4hV6cqExFRBWQ4U2g5DHLMzgQ3dT4ub0QocaP1TFEZyPKBZ+c7UzahI4svtSZ7VFllJyKirRqT5Rh+HWNKJctSwYXcLDJJIEB5dey+gULy+n1qIRyq3ovVdD62HQRls5rOR+BNCxER' +
  '7dCYLAcAbmzHQW7IlOACgAx2YJJAAxerY7yRroVLrZ0F9DDZK82bFiIi2iUAO0opg8wJLvAhSWCSW1+X8hpwktxIX9qOg0pxA7a7uiwA98oTEdEWcpxOYDsO0i9Xggt8SHJfFB8KKedLAsFqkX9uAAQ879ZdnPVARERZNCZLbjujnXInuIA54gGshNXJLTxJIOTPEIBJ' +
  'ri/W8OS1WXey9SGwHQcREenWmCxHYJJLW+yV4ALAajoPwSS3DtYALnxKIJjkeoPJrWc4EI6IiLKQJJd5CN1r7wQX+JDk8mbEX0kC4dxQqV2Y5DrP29dm3XHWAxERZdGYLEMwyaV7HJTgArwZ8Zj3CQSTXGd5/9qsO15XiIgoCya5dJ+DE1zgk5sRDgjxQ20SCCa5zrkB' +
  '0KnDa7PumOQSEVEWTHLprkISXODDzUgAJrmuq01ym0glufxw1I3TkmuGSS4REWXBJJfSCktwgQ8DQk7BapirkmnJtUluE6vp/B0Hp6l2CSa3tcQOISIiykKS3Fe24yD7Ck1wAWA1nS/AapiLbgCc1jG5TePgNJVerKbzkMltfbFDiIiIsmhMlgPwPq72Ck9wgU+qYVx1' +
  'd8Plajo/ZQJhyM30l+Br17Y1gK/k3G2qudQ5uewQIiKiB8kRQl+B93G1VUqCm0ituvOGRKc1gKeyGEEpcjPdAXBtOZS6Svbbjm0HQnqkkly+L4mI6EGNyXIMc724tRwKWVBqgguYG5LVdH4K4EXZP4tySRKIke1AtJJOhAB87VbtFWq6F5x24/uSiIiyaEyWyWygK9ux' +
  'ULVKT3AT0mb4JVjN1eCFtCQzgcgg9drlKmC5kpbkAdvlaRd5Xz4GW9CIiOgBjcnyXWOyvADwte1YqDqVJbjAD6q5vCmp3g2AL7mnMb/UhHBO5yvHFcz5tmxJpsxW03kMbiUoG6/VROS8xmQ5BIsVZVNzvag0wU1IgnUKTlquyhrA16zaHkZaIwcwVSN2IhTjFsDj1XR+' +
  'waot7SPVsvw1FF1cPXEJILQdBBFREVItyyxWFO9rAEPbQSSsJLiAOU5Ihht9Ca6+l+kSpjKm5kXnutV0HksnAm+o97eG6eQ4lSoc0UHkM+4UvJ4UIdkuEALgwhMReUNalpNiBau5h7sB8KVUdULNjgAAA95JREFUyNWwluAmpG05gHmh8cakOJcAvuD5oeWRG+oOuBKY' +
  '1yVMYhvxtUlFkoXTAOZ4CN647CdZFOV2ASLyVmOyjBuTZQfcNrmvNYAXjcnyVCrjqlhPcBNSFQtgKrpsXd5fOrFd2A7Gd6m25S/A1+0u1zB7wPnapFJJcsbp/fncwGwX4KIoEdVGY7KMwEnLeV0BOJXnTiU1CW5CKrohTMLwClxVyWIN81wxsbUk1XLPRPeHrmFunHn0' +
  'D1VGFp8i8D25yy3MeejcLkBEtdSYLBcyaZndpNtdA3jcmCwvGpPlwnYw26hLcBOSMAxW0/kRgKfgC+4+NzDPTUeeq4XleGrvTqJb9wWapJsg4I0z2cLFpwcliW2H56ETEX1oWw7ARPeuJLENGpNlbDuYLD63HUAWcvEdtXrdDsxExxDAsb2IrLoFMAYwYjVML1lsGLR6' +
  '3QjABYABgBObMVXkFmaK3ohtjqSJvCdDeU9GAJ7YjMeiWwARk1oiovtJEhds+u0A5npxZjMei64BRK4ktWlOJLgJuUGJAEStXvcUJnG4gP+JA5NaR0mSN4JZoDmFSXQvADRtxlWwNT6+PmPLsRBtdSfRDWHekz69Hx9yCb5HiYgySyW6yf1bHRZGk3u6SHsb8jZOJbhp' +
  'kujNYJLdDoAAJnEI4P7NyhpALF9jth77QV6zIQC0et1kccbVZDf5ABxz2iq56M6CaQjzXjy3GFIZko4KXkeIiPYkU4LDTb89wMdOUt+Ka9cwBZlxY7J0vgPP2QQ3TS7cI/mCVMoCmKlop9D/IryFSWZnAGJWaf0nSeEY+PB6TRZnNLfB3ODjoktsNxSi4tzZBnMBt29e' +
  '2PFDRFQCSfyGAIZS1Q1hrhmubpu8wcekdmE3lGJ5keDelaruftDqdQOYZLeT+mfVL8hbAAuY2JJ/zrhXsd7uvl7ltZp8ncJOhXctMcX4uPDC1yl5TRZLhwCGjnUGXcMktVwgJSKqgFR1BwAGkuwGMNcLzYWKpEN0DCD2LalNe/T+/XvbMVgl1bMjmIS3I/87/e9pHXxM' +
  'ipNk9a5F6v8n//6ONx20r1ave4SP3QhHMB+iQDEfojcA3sEkse9gPvgWbGcsT6vX1fKh+5iV+OxSnUEBzHvR1or9LWRxFCahjS3F4Tz5Ox3ajgMAVtN5YDsGykeSGquvH5n4S8rIcKoA5loRwN4C6Q1S1wtJymuh9gkuketSCXBW7BogKoB0W3TkK5D/XUTXRXI8xQIf' +
  'u33eMZklInLPpt8uq1CRdNsBnxYq3tUpmb0PE1wiIqISpDqEdmHXBBFRjUlHQJbrxcyHIVBl+//kfyV8NkIgpQAAAABJRU5ErkJggg==';


function StaticBrandRow({ logos }: { logos: { alt: string; src: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {logos.map(logo => (
        <div
          key={logo.alt}
          className="flex items-center justify-center w-24 h-24 rounded-xl bg-white border border-slate-200 shadow-sm"
        >
          <img src={logo.src} alt={logo.alt} className="h-16 w-16 object-contain" />
        </div>
      ))}
    </div>
  );
}

function BrandCarousel({ logos, className }: { logos: { alt: string; src: string }[]; className?: string }) {
  const items = useMemo(() => [...logos, ...logos], [logos]);

  return (
    <div className={`overflow-hidden ${className || ''}`}>
      <div className="flex items-center gap-6 animate-logo-marquee">
        {items.map((logo, idx) => (
          <div
            key={`${logo.alt}-${idx}`}
            className="flex items-center justify-center w-24 h-24 rounded-xl bg-white border border-slate-200 shadow-sm flex-shrink-0"
          >
            <img src={logo.src} alt={logo.alt} className="h-16 w-16 object-contain" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TopBrandsSection() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8">
      <h4 className="text-xl font-bold text-slate-900 mb-4">Usamos Sólo las Mejores Marcas</h4>
      <p className="text-sm text-slate-600 mb-6">Líderes mundiales en tecnología solar</p>
      <BrandCarousel logos={TOP_BRAND_LOGOS} className="py-2" />
    </div>
  );
}

function WhatYouGet({ maxEquipmentWarranty }: { maxEquipmentWarranty: number }) {
  return (
    <>
      <h4 className="text-xl font-bold text-slate-900 mb-6">¿Qué Obtienes con Tu Sistema Solar?</h4>

      <div className="bg-slate-50 border-2 rounded-xl p-6 mb-6" style={{ borderColor: '#ff9b7a' }}>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-base text-slate-700 leading-relaxed">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
            <p>Instalación por técnicos certificados</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
            <p>Garantía de instalación: <strong>2 años</strong></p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
            <p>Todos los trámites ante CFE</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
            <p>Garantía de equipos: <strong>hasta {maxEquipmentWarranty || 12} años</strong></p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
            <p>App de monitoreo de energía en tiempo real</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
            <p>Garantía de generación de energía: <strong>2 años</strong></p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
            <p>Aumenta el valor de tu propiedad</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
            <p>Protección contra subidas de precios de CFE</p>
          </div>
        </div>
      </div>
    </>
  );
}

function openCalendlyPopup(e: React.MouseEvent<HTMLAnchorElement>) {
  if (window.Calendly) {
    e.preventDefault();
    window.Calendly.initPopupWidget({ url: CALENDLY_URL });
  }
}

function CalendlyWidget() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <>
      <div className="mt-6">
        <div
          className="calendly-inline-widget"
          data-url={CALENDLY_URL}
          style={{ minWidth: '320px', height: '700px' }}
        />
      </div>
      <div className="print-cta mt-6 text-center">
        <a
          href={CALENDLY_URL}
          className="inline-block px-12 py-5 rounded-xl font-bold text-xl shadow-2xl mb-4"
          target="_blank"
          rel="noreferrer noopener"
          style={{ background: '#ff5c36', color: 'white' }}
        >
          Agendar Visita Técnica Gratuita
        </a>
        <p className="text-sm text-slate-500">Visita: calendly.com/narciso-solarya/30min</p>
      </div>
    </>
  );
}

function ProposalCard({
  data,
  title,
  onClose,
  showSharedSections = true,
  validUntil,
  variantKey = 'actual'
}: {
  data: ProposalData;
  title: string;
  onClose: () => void;
  showSharedSections?: boolean;
  validUntil: Date;
  variantKey?: 'actual' | 'futura';
}) {
  const { system, financial, environmental, components, porcentajeCobertura, showDACWarning, dacBimonthlyPayment, dacFinancial } = data;
  const maxEquipmentWarranty = getMaxProductWarranty(components);

  const panelComponent = components.find(
    comp => comp.type === 'panel' || comp.concepto.toLowerCase().includes('panel')
  );
  const microinverterComponent = components.find(
    comp => comp.type === 'microinverter' || comp.concepto.toLowerCase().includes('microinversor')
  );
  const inverterComponent = components.find(comp => {
    const concepto = comp.concepto.toLowerCase();
    return comp.type === 'inverter' || (concepto.includes('inversor') && !concepto.includes('micro'));
  });
  const montajeComponent = components.find(
    comp => comp.type === 'montaje' || comp.concepto.toLowerCase().includes('montaje')
  );
  const panelInfo: ComponentBreakdown = panelComponent || {
    concepto: 'Paneles solares',
    cantidad: system.numPaneles,
    marca: '',
    modelo: '',
    productWarrantyYears: undefined,
    generationWarrantyYears: undefined,
    capacityWatts: system.potenciaPorPanel
  };

  const panelProductWarranty = inferProductWarrantyYears(panelInfo);
  const panelGenerationWarranty = inferGenerationWarrantyYears(panelInfo);
  const microWarranty = microinverterComponent ? inferProductWarrantyYears(microinverterComponent) : undefined;
  const inverterWarranty = inverterComponent ? inferProductWarrantyYears(inverterComponent) : undefined;
  const montajeWarranty = montajeComponent ? inferProductWarrantyYears(montajeComponent) : undefined;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden print-compact-card">
      <div
        className="p-6 md:p-8 print-compact-section pdf-section"
        data-pdf-section="overview"
        data-pdf-variant={variantKey}
      >
        <h3 className="text-2xl font-bold mb-6 print-compact-heading" style={{ color: '#1e3a2b' }}>{title}</h3>

        <div className="bg-slate-50 rounded-xl p-6 mb-6 border border-slate-200 print-compact-card">
          <div className="flex items-center justify-center mb-4">
            <TrendingDown className="w-5 h-5" style={{ color: '#ff5c36' }} />
            <h4 className="text-base font-bold text-slate-900 ml-2">Tu Ahorro con SolarYa</h4>
          </div>

          <div className="flex items-center justify-center gap-6 mb-5 flex-wrap">
            <div className="text-center">
              <div className="text-xs font-semibold text-slate-600 mb-1">PAGAS AHORA A CFE</div>
              <div className="text-3xl font-bold text-slate-700 line-through">{formatCurrency(financial.pagoAhora)}</div>
            </div>
            <div className="text-4xl font-bold" style={{ color: '#ff5c36' }}>→</div>
            <div className="text-center">
              <div className="text-xs font-semibold text-slate-600 mb-1">CON SOLARYA PAGARÁS</div>
              <div className="text-3xl font-bold" style={{ color: '#3cd070' }}>{formatCurrency(financial.pagoFuturo)}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 text-center border-2" style={{ borderColor: '#ff9b7a' }}>
            <p className="text-xs font-semibold text-slate-600 mb-1">AHORRAS CADA BIMESTRE</p>
            <p className="text-4xl font-bold" style={{ color: '#ff5c36' }}>
              {formatCurrency(financial.ahorroBimestral)}
            </p>
          </div>
        </div>

        {showDACWarning && dacBimonthlyPayment !== undefined && dacFinancial && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 print-compact-card">
            <p className="text-sm font-bold text-amber-900 mb-3">⚠️ Advertencia Tarifa DAC</p>
            <ul className="space-y-2 text-sm text-amber-800">
              <li className="flex items-start gap-2">
                <span className="text-amber-900 font-bold mt-0.5">•</span>
                <span>Tu consumo bimestral de energía es alto y de seguir así los siguientes meses, la CFE podría pasarte a tarifa DAC (tarifa residencial de alto consumo).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-900 font-bold mt-0.5">•</span>
                <span>Si caes (o ya estás) en tarifa DAC, pagarías <strong>{formatCurrency(dacBimonthlyPayment)}</strong> al bimestre.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-900 font-bold mt-0.5">•</span>
                <span>Con SolarYa pagarías <strong>{formatCurrency(financial.pagoFuturo)}</strong> al bimestre.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-900 font-bold mt-0.5">•</span>
                <span>Tu ahorro bimestral en DAC sería de <strong>{formatCurrency(dacBimonthlyPayment - financial.pagoFuturo)}</strong>.</span>
              </li>
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print-compact-grid">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 print-compact-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#ff5c36' }}>
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h5 className="text-sm font-bold text-slate-700">Tu Sistema Solar</h5>
            </div>
            <p className="text-3xl font-bold mb-2" style={{ color: '#1e3a2b' }}>{safeToFixed(system.potenciaTotal / 1000, 1)} kilowatts</p>
            <div className="space-y-1 text-sm text-slate-600 print-compact-text">
              <p><strong className="text-slate-900">{system.numPaneles}</strong> paneles solares de <strong className="text-slate-900">{system.potenciaPorPanel}</strong> watts c/u</p>
              <p>Energía generada: <strong className="text-slate-900">{Math.round(system.generacionMensualKwh * 2)}</strong> kWh/bimestre</p>
              <p>Generas el <strong className="text-slate-900">{safeToFixed(porcentajeCobertura, 0)}%</strong> de tu consumo</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 print-compact-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#1e3a2b' }}>
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h5 className="text-sm font-bold text-slate-700">Retorno de Inversión</h5>
            </div>
            <p className="text-3xl font-bold mb-2" style={{ color: '#1e3a2b' }}>{safeToFixed(financial.anosRetorno, 1)} años</p>
            <div className="space-y-1 text-sm text-slate-600 print-compact-text">
              <p>Ahorro en 25 años:</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency((financial.ahorroEn25 ?? (financial.ahorroBimestral * 6 * 25)))}</p>
            </div>
          </div>
        </div>
      </div>

      <div
        className="p-6 md:p-8 pt-0 print-compact-section pdf-section"
        data-pdf-section="investment"
        data-pdf-variant={variantKey}
      >
        <div className="border-t border-slate-200 pt-6 mb-6 print-break-before print-break-after print-avoid-break print-compact-section">
          <h4 className="text-lg font-bold text-slate-900 mb-4">Tu Inversión</h4>
          <div className="bg-slate-50 rounded-xl p-5 space-y-2 border border-slate-200 print-compact-card">
            <div className="flex justify-between text-slate-700">
              <span>Precio de lista:</span>
              <span className="font-semibold">{formatCurrency(financial.precioLista)}</span>
            </div>
            <div className="flex justify-between font-semibold" style={{ color: '#3cd070' }}>
              <span>Descuento {financial.descuentoPorcentaje ? `(${Math.round(financial.descuentoPorcentaje * 100)}%)` : ''}:</span>
              <span>-{formatCurrency(financial.descuento)}</span>
            </div>
            <div className="flex justify-between text-slate-700 border-t pt-2">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatCurrency(financial.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>IVA:</span>
              <span className="font-semibold">{formatCurrency(financial.iva)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t" style={{ color: '#1e3a2b' }}>
              <span>INVERSIÓN TOTAL</span>
              <span>{formatCurrency(financial.total)}</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 mt-3 text-right">Vigencia de propuesta: hasta {formatLongDate(validUntil)}</p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 print-compact-card">
            <p className="text-sm font-bold text-slate-900 mb-3">Pago en 3 exhibiciones:</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {(financial.pagosEnExhibiciones && financial.pagosEnExhibiciones.length > 0 ? financial.pagosEnExhibiciones : [financial.total * 0.5, financial.total * 0.25, financial.total * 0.25]).map((pago, idx) => {
                const pct = financial.secuenciaExhibiciones?.[idx] ? Math.round(financial.secuenciaExhibiciones[idx] * 100) : idx === 0 ? 50 : 25;
                return (
                  <div key={idx}>
                    <p className="text-xs text-slate-600 mb-1">{idx === 0 ? 'Anticipo' : `${idx + 1}º pago`} {pct}%</p>
                    <p className="text-lg font-bold" style={{ color: '#1e3a2b' }}>{formatCurrency(pago)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-5 print-compact-card">
            <h5 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TreePine className="w-4 h-4" style={{ color: '#3cd070' }} />
              Impacto ambiental anual de tu sistema
            </h5>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-2xl mb-1">🌳</div>
                <p className="text-xl font-bold" style={{ color: '#1e3a2b' }}>{environmental.arboles}</p>
                <p className="text-xs text-slate-600 mt-0.5">árboles plantados</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">🛢️</div>
                <p className="text-xl font-bold" style={{ color: '#1e3a2b' }}>{environmental.barrilesPetroleo}</p>
                <p className="text-xs text-slate-600 mt-0.5">barriles de petróleo evitados</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">☁️</div>
                <p className="text-xl font-bold" style={{ color: '#1e3a2b' }}>{environmental.toneladasCO2}</p>
                <p className="text-xs text-slate-600 mt-0.5">kilogramos de CO₂ reducidos</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      <div
        className="p-6 md:p-8 pt-0 print-compact-section pdf-section"
        data-pdf-section="components"
        data-pdf-variant={variantKey}
      >

        {showSharedSections && (
          <div className="mt-6 border-t border-slate-200 pt-8 print-break-before print-avoid-break print-hidden">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Zap className="w-8 h-8" style={{ color: '#ff5c36' }} />
              <h4 className="text-2xl md:text-3xl font-bold text-center" style={{ color: '#1e3a2b' }}>
                Da el Siguiente Paso Hacia Tu Independencia Energética
              </h4>
              <Zap className="w-8 h-8" style={{ color: '#ff5c36' }} />
            </div>
            <p className="text-center text-slate-600 mb-4 max-w-3xl mx-auto leading-relaxed">
              Agenda tu visita técnica <strong>100% GRATUITA</strong> y sin compromiso. Nuestros expertos evaluarán tu propiedad y te entregarán una propuesta personalizada.
            </p>
            <p className="text-center text-slate-700 font-semibold mb-6 text-lg">
              Selecciona la fecha y hora que mejor te convenga
            </p>
            <CalendlyWidget />
            <p className="text-xs text-slate-500 mt-4 text-center">Sin compromiso · Evaluación profesional · 100% gratis</p>
          </div>
        )}

        {showSharedSections && (
          <div
            className="border-t border-slate-200 pt-6 mb-6 print-break-before print-avoid-break pdf-section"
            data-pdf-section="whatyouget"
          >
            <WhatYouGet maxEquipmentWarranty={maxEquipmentWarranty} />
          </div>
        )}

        <div className="border-t border-slate-200 pt-6 print-break-before print-avoid-break print-compact-section">
          <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-700" />
            Componentes del Sistema
          </h4>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4 print-compact-card">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-base font-semibold text-slate-900">Paneles solares</p>
                <p className="text-sm text-slate-600">Marcas líderes Tier 1</p>
              </div>
              <p className="text-sm text-slate-600 font-semibold">×{panelComponent?.cantidad ?? system.numPaneles}</p>
            </div>
            <div className="mt-4">
              <StaticBrandRow
                logos={[
                  { alt: 'JA Solar', src: '/ja_solar_square_logo.jpg' },
                  { alt: 'Canadian Solar', src: '/canadian_solar_square_logo.jpg' },
                  { alt: 'LONGi', src: '/longi_square_logo.png' }
                ]}
              />
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p>• Potencia: <strong>{panelComponent?.capacityWatts ?? system.potenciaPorPanel}</strong> Watts</p>
              <p>• Dimensiones: {panelComponent?.measurementsM2 ? `${panelComponent.measurementsM2} metros cuadrados` : 'Datos por confirmar'}</p>
              <p>
                • Garantía de producto: <strong>{panelProductWarranty || 'Por confirmar'}</strong>
                {panelProductWarranty ? ' años' : ''}
              </p>
              <p>
                • Garantía de generación: <strong>{panelGenerationWarranty || 'Por confirmar'}</strong>
                {panelGenerationWarranty ? ' años' : ''}
              </p>
            </div>
          </div>

          {microinverterComponent ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4 print-compact-card">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-base font-semibold text-slate-900">Microinversor {microinverterComponent.marca}</p>
                  <p className="text-sm text-slate-600">Modelo {microinverterComponent.modelo}</p>
                </div>
                <p className="text-sm text-slate-600 font-semibold">×{microinverterComponent.cantidad}</p>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>
                  • Garantía: <strong>{microWarranty || 'Por confirmar'}</strong>
                  {microWarranty ? ' años' : ''}
                </p>
                <p>• Incluye DTU para monitoreo de generación de energía</p>
              </div>
            </div>
          ) : inverterComponent ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4 print-compact-card">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-base font-semibold text-slate-900">Inversor {inverterComponent.marca}</p>
                  <p className="text-sm text-slate-600">Modelo {inverterComponent.modelo}</p>
                </div>
                <p className="text-sm text-slate-600 font-semibold">×{inverterComponent.cantidad}</p>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>• Potencia: {inverterComponent.capacityKw ?? inverterComponent.modelo} kW</p>
                <p>
                  • Garantía: <strong>{inverterWarranty || 'Por confirmar'}</strong>
                  {inverterWarranty ? ' años' : ''}
                </p>
              </div>
            </div>
          ) : null}

          {montajeComponent && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 print-compact-card">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-base font-semibold text-slate-900">Montaje {montajeComponent.marca}</p>
                </div>
                <p className="text-sm text-slate-600 font-semibold">×{montajeComponent.cantidad}</p>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>• Material: aluminio de alta resistencia</p>
                <p>• Certificación antisísmica</p>
                <p>• Resistente a corrosión</p>
                <p>
                  • Garantía: <strong>{montajeWarranty || 'Por confirmar'}</strong>
                  {montajeWarranty ? ' años' : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 print-avoid-break print-break-after print-compact-card">
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong className="text-slate-900">Nota:</strong> Esta es una cotización preliminar basada en la información proporcionada.
            El precio final se ajustará tras la visita técnica gratuita donde validaremos las condiciones específicas de tu instalación.
          </p>
        </div>
      </div>
    </div>
  );
}

function SharedSections({ onClose, maxEquipmentWarranty }: { onClose: () => void; maxEquipmentWarranty: number }) {
  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8 print-hidden">
        <div className="border-b border-slate-200 pb-6 mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap className="w-8 h-8" style={{ color: '#ff5c36' }} />
            <h4 className="text-2xl md:text-3xl font-bold text-center" style={{ color: '#1e3a2b' }}>
              Da el Siguiente Paso Hacia Tu Independencia Energética
            </h4>
            <Zap className="w-8 h-8" style={{ color: '#ff5c36' }} />
          </div>
          <p className="text-center text-slate-600 mb-4 max-w-3xl mx-auto leading-relaxed">
            Agenda tu visita técnica <strong>100% GRATUITA</strong> y sin compromiso. Nuestros expertos evaluarán tu propiedad y te entregarán una propuesta personalizada.
          </p>
          <p className="text-center text-slate-700 font-semibold mb-6 text-lg">
            Selecciona la fecha y hora que mejor te convenga
          </p>
          <CalendlyWidget />
          <p className="text-xs text-slate-500 mt-4 text-center">Sin compromiso · Evaluación profesional · 100% gratis</p>
        </div>
      </div>

      <div
        className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8 print-break-before print-avoid-break print-compact-card pdf-section"
        data-pdf-section="whatyouget"
      >
        <WhatYouGet maxEquipmentWarranty={maxEquipmentWarranty} />
      </div>

      <div className="print-hidden">
        <TopBrandsSection />
      </div>

      <div
        className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8 print-avoid-break print-break-after print-compact-card"
        data-pdf-section="process"
      >
        <h4 className="text-xl font-bold text-slate-900 mb-6">Proceso y Tiempos</h4>

        <div className="relative">
          <div className="absolute left-6 top-12 bottom-12 w-0.5" style={{ background: '#ff5c36' }}></div>

          <div className="space-y-8">
            <div className="flex gap-4 relative">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10" style={{ background: '#ff5c36' }}>
                1
              </div>
              <div className="flex-1 bg-white border-2 rounded-xl p-4" style={{ borderColor: '#ff9b7a' }}>
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-bold text-slate-900">Visita Técnica</h5>
                  <span className="text-sm text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ~1 día
                  </span>
                </div>
                <p className="text-sm text-slate-700">Evaluación gratuita y propuesta final</p>
              </div>
            </div>

            <div className="flex gap-4 relative">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10" style={{ background: '#ff5c36' }}>
                2
              </div>
              <div className="flex-1 bg-white border-2 rounded-xl p-4" style={{ borderColor: '#ff9b7a' }}>
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-bold text-slate-900">Contrato y Anticipo</h5>
                  <span className="text-sm text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ~1 día
                  </span>
                </div>
                <p className="text-sm text-slate-700">Firma y pago del 50%</p>
              </div>
            </div>

            <div className="flex gap-4 relative">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10" style={{ background: '#ff5c36' }}>
                3
              </div>
              <div className="flex-1 bg-white border-2 rounded-xl p-4" style={{ borderColor: '#ff9b7a' }}>
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-bold text-slate-900">Instalación</h5>
                  <span className="text-sm text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ~5 días
                  </span>
                </div>
                <p className="text-sm text-slate-700">Sistema funcionando</p>
              </div>
            </div>

            <div className="flex gap-4 relative">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10" style={{ background: '#ff5c36' }}>
                4
              </div>
              <div className="flex-1 bg-white border-2 rounded-xl p-4" style={{ borderColor: '#ff9b7a' }}>
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-bold text-slate-900">Interconexión CFE</h5>
                  <span className="text-sm text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    2-4 semanas
                  </span>
                </div>
                <p className="text-sm text-slate-700">Trámites y medidor bidireccional</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-slate-50 border-2 rounded-xl p-4 text-center" style={{ borderColor: '#ff9b7a' }}>
          <p className="text-sm font-semibold" style={{ color: '#1e3a2b' }}>
            ⏱️ Tiempo total estimado: 4-6 semanas desde la visita hasta interconexión completa
          </p>
        </div>

        <div className="mt-6 text-center">
          <a
            href={CALENDLY_URL}
            onClick={openCalendlyPopup}
            className="inline-block px-8 py-4 rounded-xl font-bold text-lg transition-all hover:opacity-90 shadow-lg cursor-pointer"
            style={{ background: '#ff5c36', color: 'white' }}
            target="_blank"
            rel="noreferrer noopener"
          >
            Agendar visita técnica gratuita
          </a>
          <p className="text-xs text-slate-500 mt-2">Agenda tu cita ahora · Sin compromiso</p>
        </div>
      </div>

      <div
        className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8"
        data-pdf-section="faq"
      >
        <h3 className="text-2xl font-bold mb-6" style={{ color: '#1e3a2b' }}>Preguntas Frecuentes</h3>
        <FAQAccordion forceOpen={forcePdfOpen} />

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <p className="text-slate-700 mb-4">¿Tienes más preguntas? Hablemos</p>
          <a
            href={CALENDLY_URL}
            onClick={openCalendlyPopup}
            className="inline-block px-8 py-3 rounded-xl font-bold transition-all hover:opacity-90 cursor-pointer"
            style={{ background: '#ff5c36', color: 'white' }}
            target="_blank"
            rel="noreferrer noopener"
          >
            Agendar visita técnica gratuita
          </a>
        </div>
      </div>

      <div
        className="bg-white rounded-2xl shadow-lg border-2 p-8 md:p-12 text-center"
        style={{ borderColor: '#ff9b7a' }}
        data-pdf-section="cta"
      >
        <div className="text-6xl mb-4">🚀</div>
        <h3 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#1e3a2b' }}>
          Da el Primer Paso Hacia Tu Independencia Energética
        </h3>
        <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
          Agenda tu visita técnica <strong>100% gratuita</strong> y sin compromiso. Nuestros expertos evaluarán tu propiedad y te entregarán una propuesta personalizada.
        </p>
        <a
          href={CALENDLY_URL}
          onClick={openCalendlyPopup}
          className="inline-block px-12 py-5 rounded-xl font-bold text-xl transition-all hover:opacity-90 shadow-2xl mb-4 cursor-pointer"
          style={{ background: '#ff5c36', color: 'white' }}
          target="_blank"
          rel="noreferrer noopener"
        >
          Agendar Visita Técnica Gratuita
        </a>
        <p className="text-sm text-slate-500">Respuesta en menos de 24 horas · Sin letra pequeña</p>

        <div className="mt-8 flex items-center justify-center gap-8 flex-wrap text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: '#3cd070' }} />
            <span>Sin compromiso</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: '#3cd070' }} />
            <span>100% gratis</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: '#3cd070' }} />
            <span>Respuesta rápida</span>
          </div>
        </div>
      </div>
    </>
  );
}

function FAQAccordion({ forceOpen = false }: { forceOpen?: boolean }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('print');

    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsPrintMode(event.matches);
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange as (event: MediaQueryListEvent) => void);

    return () => {
      mediaQuery.removeEventListener('change', handleChange as (event: MediaQueryListEvent) => void);
    };
  }, []);

    const faqs = [
    {
      question: '¿Qué incluye exactamente el sistema?',
      answer: 'TODO INCLUIDO: Paneles de última generación, inversores/microinversores, estructura de montaje profesional, cableado especializado, protecciones eléctricas, instalación por técnicos certificados, trámites completos ante CFE, app de monitoreo en tiempo real, y todas las garantías respaldadas.'
    },
    {
      question: '¿Cuánto tiempo dura la instalación?',
      answer: 'Instalación física: 5 días laborales (1 semana). Trámites CFE: 2-4 semanas adicionales. Tiempo total: 4-6 semanas desde la visita técnica hasta que empiezas a generar energía.'
    },
    {
      question: '¿Qué garantías tengo?',
      answer: '✓ 2 años garantía total de instalación y mano de obra\n✓ 12 años garantía en equipos (inversores y accesorios)\n✓ 25 años garantía de generación de energía en paneles solares'
    },
    {
      question: '¿Qué mantenimiento requiere el sistema?',
      answer: 'Los sistemas solares requieren muy poco mantenimiento. Se recomienda limpiar los paneles 2-3 veces al año (o después de tormentas de polvo) y una revisión técnica anual. Los componentes están diseñados para operar sin problemas durante décadas.'
    }
  ];

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-100 transition-colors"
          >
            <span className="font-bold text-slate-900 pr-4">{faq.question}</span>
            {openIndex === index ? (
              <Minus className="w-5 h-5 flex-shrink-0" style={{ color: '#ff5c36' }} />
            ) : (
              <Plus className="w-5 h-5 flex-shrink-0" style={{ color: '#ff5c36' }} />
            )}
          </button>
          {(forceOpen || isPrintMode || openIndex === index) && (
            <div className="px-5 pb-5 pt-0 faq-answer">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Proposal({ proposal, onClose, userName }: ProposalProps) {
  const firstName = getFirstName(userName);
  const [showFutureProposal, setShowFutureProposal] = useState(true);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralLink, setReferralLink] = useState('');
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [forcePdfOpen, setForcePdfOpen] = useState(false);
  const creationDate = useMemo(() => new Date(), []);
  const validUntil = useMemo(() => addDays(creationDate, 7), [creationDate]);

  const handleDownloadPDF = async () => {
    setForcePdfOpen(true);

    await new Promise(resolve => requestAnimationFrame(() => resolve(null)));

    const proposalNode = document.querySelector('.proposal-scroll');

    if (!proposalNode) {
      setDownloadError('No pudimos encontrar la propuesta para exportarla.');
      setForcePdfOpen(false);
      return;
    }

    const baseUrl = window.location.origin;
    const toAbsoluteUrl = (url: string | null) => {
      if (!url) return '';
      try {
        return new URL(url, baseUrl).toString();
      } catch {
        return url;
      }
    };

    const clone = proposalNode.cloneNode(true) as HTMLElement;

    clone.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src');
      if (src) img.setAttribute('src', toAbsoluteUrl(src));
    });

    clone.querySelectorAll('source').forEach(source => {
      const srcset = source.getAttribute('srcset');
      if (!srcset) return;

      const absoluteSrcset = srcset
        .split(',')
        .map(entry => {
          const [url, descriptor] = entry.trim().split(/\s+/, 2);
          return `${toAbsoluteUrl(url)}${descriptor ? ` ${descriptor}` : ''}`;
        })
        .join(', ');

      source.setAttribute('srcset', absoluteSrcset);
    });

    const stylesheetLinksResults = await Promise.all(
      Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(link => toAbsoluteUrl(link.getAttribute('href')))
        .filter(Boolean)
        .map(async href => {
          try {
            const res = await fetch(href);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const css = await res.text();
            return `<style data-inline-pdf="true">/* ${href} */\n${css}\n</style>`;
          } catch (error) {
            console.warn('No pudimos inlinear stylesheet', href, error);
            return '';
          }
        })
    );

    const stylesheetLinks = stylesheetLinksResults.filter(Boolean).join('\n');

    const inlineStyles = Array.from(document.querySelectorAll('style'))
      .map(styleTag => styleTag.outerHTML)
      .join('\n');

    const reorganizeForPdf = (root: HTMLElement) => {
      const hero = root.querySelector('[data-pdf-section="hero"]') as HTMLElement | null;
      const overviewSections = Array.from(root.querySelectorAll('[data-pdf-section="overview"]')) as HTMLElement[];
      const investmentSections = Array.from(root.querySelectorAll('[data-pdf-section="investment"]')) as HTMLElement[];
      const whatYouGetSections = Array.from(root.querySelectorAll('[data-pdf-section="whatyouget"]')) as HTMLElement[];
      const componentSections = Array.from(root.querySelectorAll('[data-pdf-section="components"]')) as HTMLElement[];
      const processSection = root.querySelector('[data-pdf-section="process"]') as HTMLElement | null;
      const faqSection = root.querySelector('[data-pdf-section="faq"]') as HTMLElement | null;
      const ctaSection = root.querySelector('[data-pdf-section="cta"]') as HTMLElement | null;

      const createGrid = (nodes: HTMLElement[], extraClass = '') => {
        const grid = document.createElement('div');
        grid.className = `pdf-inline-grid ${nodes.length > 1 ? 'pdf-inline-grid-double' : ''} ${extraClass}`.trim();
        nodes.forEach(node => grid.appendChild(node));
        return grid;
      };

      const stack = document.createElement('div');
      stack.className = 'pdf-page-stack';

      const addPage = (className: string, nodes: (HTMLElement | null)[]) => {
        const filtered = nodes.filter(Boolean) as HTMLElement[];
        if (!filtered.length) return;
        const page = document.createElement('section');
        page.className = `pdf-page ${className}`.trim();
        const card = document.createElement('div');
        card.className = 'pdf-page-card';
        filtered.forEach(node => card.appendChild(node));
        page.appendChild(card);
        stack.appendChild(page);
      };

      const investmentGrid = investmentSections.length ? createGrid(investmentSections) : null;
      const benefitsGrid = whatYouGetSections.length ? createGrid(whatYouGetSections, 'pdf-inline-grid-stack') : null;

      addPage('page-1', [hero, overviewSections.length ? createGrid(overviewSections) : null]);
      addPage('page-2', [investmentGrid, benefitsGrid]);
      addPage('page-3', [componentSections.length ? createGrid(componentSections) : null]);
      addPage('page-4', [processSection]);
      addPage('page-5', [faqSection]);
      addPage('page-6', [ctaSection]);

      if (stack.childElementCount === 0) return;

      root.innerHTML = '';
      root.appendChild(stack);
    };

    reorganizeForPdf(clone);

    const pdfStyles = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

      @page {
        size: A4;
        margin: 0;
      }

      :root {
        --slate-50: #f8fafc;
        --slate-100: #f1f5f9;
        --slate-200: #e2e8f0;
        --slate-600: #475569;
        --slate-700: #334155;
        --slate-900: #0f172a;
        --accent: #ff5c36;
        --accent-soft: #ff9b7a;
        --accent-contrast: #0f172a;
        --pdf-page-height: 268mm;
      }

      body {
        margin: 0;
        padding: 0;
        background: radial-gradient(circle at 15% 20%, rgba(255, 92, 54, 0.08), transparent 35%),
          radial-gradient(circle at 80% 10%, rgba(14, 165, 233, 0.08), transparent 30%),
          var(--slate-50);
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: var(--slate-900);
      }

      .pdf-container {
        max-width: 960px;
        margin: 18mm auto 16mm;
        padding: 20px 26px 28px;
        background: #ffffff;
        border-radius: 20px;
        border: 1px solid var(--slate-200);
        box-shadow: 0 16px 70px rgba(15, 23, 42, 0.08);
      }

      .pdf-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 16px;
        border-bottom: 1.5px solid var(--slate-200);
        margin-bottom: 16px;
      }

      .pdf-header .brand-block {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .pdf-logo {
        height: 56px;
        width: auto;
        object-fit: contain;
      }

      .pdf-brand-text {
        font-weight: 600;
        font-size: 14px;
        color: var(--slate-600);
        letter-spacing: 0.01em;
      }

      .pdf-meta {
        text-align: right;
        color: var(--slate-600);
        font-size: 13px;
        line-height: 1.5;
      }

      .pdf-meta .title {
        font-weight: 800;
        color: var(--slate-900);
        font-size: 15px;
        margin-bottom: 4px;
      }

      .pdf-meta .date {
        font-variant-numeric: tabular-nums;
      }

      .pdf-body {
        background: linear-gradient(180deg, rgba(241, 245, 249, 0.6), rgba(255, 255, 255, 0.9));
        padding: 6px;
        border-radius: 14px;
      }

      .pdf-page-stack {
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      .pdf-page {
        page-break-after: always;
        break-after: page;
        min-height: var(--pdf-page-height);
        height: var(--pdf-page-height);
        padding: 10mm 8mm;
        box-sizing: border-box;
        display: flex;
      }

      .pdf-page:last-child {
        page-break-after: auto;
      }

      .pdf-page-card {
        background: #fff;
        border-radius: 18px;
        border: 1px solid var(--slate-200);
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
        padding: 12mm 10mm;
        display: flex;
        flex-direction: column;
        gap: 10mm;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }

      .pdf-inline-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
        align-items: stretch;
      }

      .pdf-inline-grid.pdf-inline-grid-double {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .pdf-inline-grid.pdf-inline-grid-stack {
        grid-auto-rows: 1fr;
      }

      .pdf-inline-grid > [data-pdf-section] {
        height: 100%;
      }

      [data-pdf-section] {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .pdf-page.page-1 [data-pdf-section="hero"] {
        min-height: 40mm;
        display: flex;
        align-items: center;
      }

      .pdf-page.page-1 [data-pdf-section="overview"] {
        min-height: 150mm;
      }

      .pdf-page.page-2 [data-pdf-section="investment"] {
        min-height: 120mm;
      }

      .pdf-page.page-2 [data-pdf-section="whatyouget"] {
        min-height: 90mm;
      }

      .pdf-page.page-3 [data-pdf-section="components"] {
        min-height: 200mm;
      }

      .pdf-page.page-4 [data-pdf-section="process"] {
        min-height: 190mm;
      }

      .pdf-page.page-5 [data-pdf-section="faq"] {
        min-height: 190mm;
      }

      .pdf-page.page-6 [data-pdf-section="cta"] {
        min-height: 140mm;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .pdf-body .proposal-scroll {
        background: transparent;
        box-shadow: none;
        padding: 0;
      }

      .pdf-body h1,
      .pdf-body h2,
      .pdf-body h3,
      .pdf-body h4,
      .pdf-body h5,
      .pdf-body h6 {
        color: var(--slate-900);
        letter-spacing: -0.01em;
      }

      .pdf-body h2,
      .pdf-body h3 {
        border-left: 4px solid var(--accent);
        padding-left: 10px;
      }

      .pdf-body p,
      .pdf-body li,
      .pdf-body span {
        color: var(--slate-700);
      }

      .pdf-body strong {
        color: var(--slate-900);
      }

      .pdf-body .bg-white,
      .pdf-body .rounded-2xl,
      .pdf-body .shadow,
      .pdf-body .shadow-lg,
      .pdf-body .shadow-xl,
      .pdf-body .border,
      .pdf-body .print-compact-card {
        background: #ffffff !important;
        border: 1px solid var(--slate-200) !important;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06) !important;
      }

      .pdf-body .print-avoid-break,
      .pdf-body section,
      .pdf-body .rounded-2xl,
      .pdf-body .shadow,
      .pdf-body .shadow-lg,
      .pdf-body .shadow-xl {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .pdf-body .badge,
      .pdf-body .chip,
      .pdf-body .tag,
      .pdf-body .text-orange-500,
      .pdf-body .text-orange-600,
      .pdf-body .text-orange-700 {
        color: var(--accent) !important;
      }

      .pdf-body .border-orange-200,
      .pdf-body .border-orange-300 {
        border-color: var(--accent-soft) !important;
      }

      .pdf-body .bg-orange-50 {
        background: rgba(255, 92, 54, 0.06) !important;
      }

      .pdf-body .highlight-box,
      .pdf-body .bg-slate-50,
      .pdf-body .bg-slate-100,
      .pdf-body .bg-slate-200 {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95)) !important;
        border: 1px solid var(--slate-200) !important;
      }

      .pdf-body .stat-value,
      .pdf-body .text-3xl,
      .pdf-body .text-4xl {
        color: var(--slate-900) !important;
      }

      .pdf-body .accent-divider {
        height: 1px;
        width: 100%;
        background: linear-gradient(90deg, rgba(255, 92, 54, 0), rgba(255, 92, 54, 0.7), rgba(255, 92, 54, 0));
        margin: 12px 0 6px;
      }

      .pdf-body ul {
        padding-left: 18px;
      }

      .pdf-body li {
        margin-bottom: 6px;
      }

      .pdf-body table {
        border-collapse: collapse;
        width: 100%;
      }

      .pdf-body th,
      .pdf-body td {
        border: 1px solid var(--slate-200);
        padding: 10px 12px;
      }

      .pdf-body th {
        background: rgba(255, 92, 54, 0.06);
        color: var(--slate-900);
        font-weight: 700;
      }

      .pdf-body .print-break-before {
        break-before: page;
        page-break-before: always;
      }

      .pdf-body .print-break-after {
        break-after: page;
        page-break-after: always;
      }
    `;

    const fetchDataUrl = async (url: string, fallback?: string) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();

        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result;
            if (typeof result === 'string') {
              resolve(result);
            } else {
              reject(new Error('Unable to encode asset'));
            }
          };
          reader.onerror = () => reject(new Error('Unable to encode asset'));
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('No pudimos incrustar el logo en base64', error);
        return fallback || url;
      }
    };

    const logoAbsoluteUrl = toAbsoluteUrl('/SolarYa logos_Primary Logo.png');
    const logoDataUrl = await fetchDataUrl(logoAbsoluteUrl, EMBEDDED_LOGO_FALLBACK);

    const generatedAt = new Date().toLocaleString('es-MX', {
      dateStyle: 'long',
      timeStyle: 'short'
    });

    const html = `<!doctype html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          ${stylesheetLinks}
          ${inlineStyles}
          <style>${pdfStyles}</style>
        </head>
        <body>
          <div class="pdf-container">
            <header class="pdf-header">
              <div class="brand-block">
                <img src="${logoDataUrl}" alt="SolarYa" class="pdf-logo" />
                <div class="pdf-brand-text">Accesible. Confiable. Simple.</div>
              </div>
              <div class="pdf-meta">
                <div class="title">Propuesta personalizada</div>
                <div class="date">Generada el ${generatedAt}</div>
              </div>
            </header>
            <div class="pdf-body">
              <div class="proposal-overlay">${clone.outerHTML}</div>
            </div>
          </div>
        </body>
      </html>`;

    setIsDownloading(true);
    setDownloadError('');

    try {
      const apiBase =
        import.meta.env.VITE_PROPOSAL_API_BASE ?? import.meta.env.VITE_API_BASE ?? '';

        const response = await fetch(`${apiBase}/api/proposal_pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html,
          fileName: `propuesta-${firstName.toLowerCase() || 'solarya'}.pdf`,
          margin: {
            top: '16mm',
            right: '12mm',
            bottom: '16mm',
            left: '12mm'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('PDF function responded with an error', response.status, errorText);
        throw new Error('No pudimos generar el PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `propuesta-${firstName.toLowerCase() || 'solarya'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF', error);
      setDownloadError('No pudimos generar el PDF. Inténtalo de nuevo.');
    } finally {
      setIsDownloading(false);
      setForcePdfOpen(false);
    }
  };

  const handleGenerateReferral = async () => {
    setShowReferralModal(true);
    setReferralLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE || ''}/api/referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userName,
          email: '', // Could be captured from form if available
          whatsapp: '' // Could be captured from form if available
        })
      });

      const data = await response.json();
      if (data.ok && data.link) {
        setReferralLink(data.link);
      }
    } catch (error) {
      console.error('Error generating referral:', error);
    } finally {
      setReferralLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(`¡Hola! 👋 Te comparto este enlace para que cotices tu sistema solar con SolarYa. Es súper fácil y rápido: ${referralLink}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .app-main-content {
            display: none !important;
          }
          .proposal-overlay, .proposal-overlay * {
            visibility: visible;
          }
          .proposal-overlay, .proposal-scroll {
            position: static !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            padding: 8px 10px !important;
            width: 100% !important;
          }
          .calendly-inline-widget {
            display: none !important;
          }
          .print-hidden {
            display: none !important;
          }
          .print-cta {
            display: block !important;
          }
          .print-break-before {
            break-before: page;
            page-break-before: always;
          }
          .print-break-after {
            break-after: page;
            page-break-after: always;
          }
          .print-avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print-compact-card {
            padding: 14px 16px !important;
            margin-bottom: 12px !important;
          }
          .print-compact-grid {
            gap: 12px !important;
          }
          .print-compact-section {
            padding-top: 10px !important;
            padding-bottom: 10px !important;
          }
          .print-compact-heading {
            margin-bottom: 12px !important;
          }
          .print-compact-text {
            margin-bottom: 8px !important;
            line-height: 1.3 !important;
          }
          .print-page {
            break-after: page;
            page-break-after: always;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print-last-page {
            break-after: avoid;
            page-break-after: auto;
          }
          .faq-answer {
            display: block !important;
          }
          @page {
            margin: 0.5cm;
            size: letter;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            background: white !important;
          }
          .bg-white.rounded-2xl {
            page-break-inside: auto;
            page-break-after: auto;
          }
          h2, h3, h4 {
            page-break-after: avoid;
          }
        }
        .print-cta {
          display: none;
        }
        .print-hidden {
          display: block;
        }
      `}</style>
        <div className="min-h-screen bg-slate-50 py-8 px-4 relative proposal-scroll">
          <div className="fixed top-6 right-6 z-50 flex gap-3 no-print">
            <button
              onClick={handleGenerateReferral}
              className="w-12 h-12 bg-green-500 rounded-full shadow-lg border border-green-600 flex items-center justify-center hover:bg-green-600 transition-all"
              aria-label="Referir a un amigo"
              title="Referir a un amigo"
            >
              <Share2 className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className={`w-12 h-12 bg-white rounded-full shadow-lg border border-slate-300 flex items-center justify-center transition-all ${
                isDownloading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-slate-100'
              }`}
              aria-label="Descargar PDF"
              aria-busy={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="w-6 h-6 text-slate-700 animate-spin" />
              ) : (
                <Download className="w-6 h-6 text-slate-700" />
              )}
            </button>
            <button
              onClick={onClose}
              className="w-12 h-12 bg-white rounded-full shadow-lg border border-slate-300 flex items-center justify-center hover:bg-slate-100 transition-all"
              aria-label="Cerrar propuesta"
            >
              <X className="w-6 h-6 text-slate-700" />
            </button>
          </div>

          {downloadError && (
            <div className="fixed top-20 right-6 z-50 bg-red-50 text-red-800 border border-red-200 shadow-lg rounded-xl px-4 py-3 text-sm max-w-xs no-print">
              {downloadError}
            </div>
          )}

          <div className="max-w-6xl mx-auto">
            <div
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8 print-compact-card"
              data-pdf-section="hero"
            >
              <div className="flex items-center justify-between flex-wrap gap-6">
                <div>
                  <img
                    src="/SolarYa logos_Primary Logo.png"
                    alt="SolarYa"
                    className="h-8 md:h-10 w-auto opacity-90"
                  />
                  <p className="text-slate-500 text-xs md:text-sm mt-1.5">Accesible. Confiable. Simple.</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">Esta es tu propuesta, {firstName}</p>
                  <p className="text-sm text-slate-600">{formatLongDate(creationDate)}</p>
                </div>
              </div>
            </div>

        {proposal.future && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 print-hidden">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-blue-900 mb-3">
                  <strong>💡 Planificación inteligente:</strong> Hemos preparado dos propuestas para ti.
                  La segunda considera las cargas adicionales que planeas instalar, asegurando que tu sistema crezca con tus necesidades.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-semibold text-blue-900 whitespace-nowrap">
                  Comparar con cargas futuras
                </span>
                <button
                  onClick={() => setShowFutureProposal(!showFutureProposal)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showFutureProposal ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={showFutureProposal}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showFutureProposal ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {proposal.future ? (
          <>
            <div className={`mb-8 ${showFutureProposal ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : ''}`}>
              <ProposalCard data={proposal.current} title="Propuesta para Consumo Actual" onClose={onClose} showSharedSections={false} validUntil={validUntil} />
              {showFutureProposal && (
                <ProposalCard data={proposal.future} title="Propuesta con Cargas Futuras" onClose={onClose} showSharedSections={false} validUntil={validUntil} />
              )}
            </div>
            <SharedSections
              onClose={onClose}
              maxEquipmentWarranty={getMaxProductWarranty([
                ...proposal.current.components,
                ...(proposal.future?.components ?? [])
              ])}
            />
          </>
        ) : (
          <div className="mb-8">
            <ProposalCard data={proposal.current} title="Tu Propuesta Personalizada de Sistema de Paneles Solares" onClose={onClose} validUntil={validUntil} />
          </div>
        )}

        {!proposal.future && (
          <>
            <div className="print-hidden">
              <TopBrandsSection />
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8 print-avoid-break print-break-after print-compact-card">
              <h4 className="text-xl font-bold text-slate-900 mb-6">Proceso y Tiempos</h4>

              <div className="relative">
                <div className="absolute left-6 top-12 bottom-12 w-0.5" style={{ background: '#ff5c36' }}></div>

                <div className="space-y-8">
                  <div className="flex gap-4 relative">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10" style={{ background: '#ff5c36' }}>
                      1
                    </div>
                    <div className="flex-1 bg-white border-2 rounded-xl p-4" style={{ borderColor: '#ff9b7a' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-bold text-slate-900">Visita Técnica</h5>
                        <span className="text-sm text-slate-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~1 día
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">Evaluación gratuita y propuesta final</p>
                    </div>
                  </div>

                  <div className="flex gap-4 relative">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10" style={{ background: '#ff5c36' }}>
                      2
                    </div>
                    <div className="flex-1 bg-white border-2 rounded-xl p-4" style={{ borderColor: '#ff9b7a' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-bold text-slate-900">Contrato y Anticipo</h5>
                        <span className="text-sm text-slate-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~1 día
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">Firma y pago del 50%</p>
                    </div>
                  </div>

                  <div className="flex gap-4 relative">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10" style={{ background: '#ff5c36' }}>
                      3
                    </div>
                    <div className="flex-1 bg-white border-2 rounded-xl p-4" style={{ borderColor: '#ff9b7a' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-bold text-slate-900">Instalación</h5>
                        <span className="text-sm text-slate-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~5 días
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">Sistema funcionando</p>
                    </div>
                  </div>

                  <div className="flex gap-4 relative">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10" style={{ background: '#ff5c36' }}>
                      4
                    </div>
                    <div className="flex-1 bg-white border-2 rounded-xl p-4" style={{ borderColor: '#ff9b7a' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-bold text-slate-900">Interconexión CFE</h5>
                        <span className="text-sm text-slate-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          2-4 semanas
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">Trámites y medidor bidireccional</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-slate-50 border-2 rounded-xl p-4 text-center" style={{ borderColor: '#ff9b7a' }}>
                <p className="text-sm font-semibold" style={{ color: '#1e3a2b' }}>
                  ⏱️ Tiempo total estimado: 4-6 semanas desde la visita hasta interconexión completa
                </p>
              </div>

              <div className="mt-6 text-center">
                <a
                  href={CALENDLY_URL}
                  onClick={openCalendlyPopup}
                  className="inline-block px-8 py-4 rounded-xl font-bold text-lg transition-all hover:opacity-90 shadow-lg cursor-pointer"
                  style={{ background: '#ff5c36', color: 'white' }}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Agendar visita técnica gratuita
                </a>
                <p className="text-xs text-slate-500 mt-2">Agenda tu cita ahora · Sin compromiso</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8 print-break-before print-avoid-break print-compact-card">
              <h3 className="text-2xl font-bold mb-6" style={{ color: '#1e3a2b' }}>Preguntas Frecuentes</h3>
              <FAQAccordion forceOpen={forcePdfOpen} />

              <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                <p className="text-slate-700 mb-4">¿Tienes más preguntas? Hablemos</p>
                <a
                  href={CALENDLY_URL}
                  onClick={openCalendlyPopup}
                  className="inline-block px-8 py-3 rounded-xl font-bold transition-all hover:opacity-90 cursor-pointer"
                  style={{ background: '#ff5c36', color: 'white' }}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Agendar visita técnica gratuita
                </a>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border-2 p-8 md:p-12 text-center print-last-page print-avoid-break print-compact-card" style={{ borderColor: '#ff9b7a' }}>
          <div className="text-6xl mb-4">🚀</div>
          <h3 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#1e3a2b' }}>
            Da el Primer Paso Hacia Tu Independencia Energética
          </h3>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Agenda tu visita técnica <strong>100% gratuita</strong> y sin compromiso. Nuestros expertos evaluarán tu propiedad y te entregarán una propuesta personalizada.
          </p>
          <a
            href={CALENDLY_URL}
            onClick={openCalendlyPopup}
            className="inline-block px-12 py-5 rounded-xl font-bold text-xl transition-all hover:opacity-90 shadow-2xl mb-4 cursor-pointer"
            style={{ background: '#ff5c36', color: 'white' }}
            target="_blank"
            rel="noreferrer noopener"
          >
            Agendar Visita Técnica Gratuita
          </a>
          <p className="text-sm text-slate-500">Respuesta en menos de 24 horas · Sin letra pequeña</p>

          <div className="mt-8 flex items-center justify-center gap-8 flex-wrap text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" style={{ color: '#3cd070' }} />
              <span>Sin compromiso</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" style={{ color: '#3cd070' }} />
              <span>100% gratis</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" style={{ color: '#3cd070' }} />
              <span>Respuesta rápida</span>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
      </div>

      {/* Referral Modal */}
      {showReferralModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] no-print" onClick={() => setShowReferralModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Share2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">¡Comparte con tus amigos!</h3>
              <p className="text-slate-600">
                Ayuda a alguien más a ahorrar en su recibo de luz compartiendo este enlace
              </p>
            </div>

            {referralLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              </div>
            ) : referralLink ? (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-600 mb-2">Tu enlace único:</p>
                  <p className="text-sm font-mono text-slate-900 break-all">{referralLink}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-semibold transition-colors"
                  >
                    {referralCopied ? (
                      <>
                        <Check className="w-5 h-5" />
                        ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copiar
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </button>
                </div>

                <p className="text-xs text-center text-slate-500 mt-4">
                  Los referidos que entren por tu enlace quedarán registrados en tu nombre
                </p>
              </div>
            ) : (
              <p className="text-center text-slate-600 py-4">
                Hubo un error al generar tu enlace. Por favor intenta de nuevo.
              </p>
            )}

            <button
              onClick={() => setShowReferralModal(false)}
              className="w-full mt-6 px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
const CALENDLY_URL = 'https://calendly.com/narciso-solarya/30min';

