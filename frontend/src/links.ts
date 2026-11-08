import type { TransportPlan } from "./types";

/**
 * Links de busca pré-preenchidos para comparadores, companhias aéreas e sites de ônibus.
 * Não fazemos scraping: os sites bloqueiam isso e mudam o tempo todo.
 * Cada link abre a busca já montada no próprio site, com os preços reais do momento.
 */

export interface SearchLink {
  name: string;
  url: string;
  note?: string;
  /** true quando o link abre a busca já preenchida (e não só a página inicial) */
  prefilled: boolean;
}

export interface LinkGroup {
  key: string;
  title: string;
  icon: string;
  description: string;
  links: SearchLink[];
}

/** Códigos IATA de cidades comuns (código de cidade quando existe, para pegar todos os aeroportos). */
const IATA: Record<string, string> = {
  "sao paulo": "SAO", "rio de janeiro": "RIO", "belo horizonte": "BHZ", "brasilia": "BSB", "salvador": "SSA",
  "recife": "REC", "fortaleza": "FOR", "porto alegre": "POA", "curitiba": "CWB", "florianopolis": "FLN",
  "navegantes": "NVT", "joinville": "JOI", "itajai": "NVT", "balneario camboriu": "NVT", "chapeco": "XAP",
  "manaus": "MAO", "belem": "BEL", "natal": "NAT", "maceio": "MCZ", "joao pessoa": "JPA", "aracaju": "AJU",
  "sao luis": "SLZ", "teresina": "THE", "goiania": "GYN", "cuiaba": "CGB", "campo grande": "CGR",
  "vitoria": "VIX", "campinas": "VCP", "foz do iguacu": "IGU", "porto seguro": "BPS", "londrina": "LDB",
  "maringa": "MGF", "uberlandia": "UDI", "ribeirao preto": "RAO", "fernando de noronha": "FEN",
  "lisboa": "LIS", "porto": "OPO", "madri": "MAD", "madrid": "MAD", "barcelona": "BCN", "paris": "PAR",
  "londres": "LON", "roma": "ROM", "milao": "MIL", "amsterda": "AMS", "berlim": "BER", "frankfurt": "FRA",
  "nova york": "NYC", "nova iorque": "NYC", "new york": "NYC", "miami": "MIA", "orlando": "ORL",
  "los angeles": "LAX", "buenos aires": "BUE", "santiago": "SCL", "montevideu": "MVD", "lima": "LIM",
  "bogota": "BOG", "cancun": "CUN", "cidade do mexico": "MEX", "toquio": "TYO", "dubai": "DXB",
};

export const plain = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Primeira parte antes da vírgula: "São Paulo, SP" → "São Paulo" */
export const cityName = (s: string) => s.split(/[,(/-]/)[0].trim();

/** Aceita "GRU", "São Paulo (GRU)" ou um nome de cidade da tabela. */
export function toIata(place: string): string | null {
  const code = place.match(/\b([A-Z]{3})\b/);
  if (code) return code[1];
  return IATA[plain(cityName(place))] ?? null;
}

/** "São Paulo, SP" → "sao-paulo-sp" (padrão de URL dos sites de ônibus) */
export function busSlug(place: string): string {
  return plain(place.replace(/\(.*?\)/g, ""))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const ymd = (d: string) => d;
const yymmdd = (d: string) => d.slice(2).replace(/-/g, "");
const ddmmyyyy = (d: string) => d.split("-").reverse().join("/");
const google = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

export function buildLinks(p: TransportPlan): LinkGroup[] {
  const from = toIata(p.origin);
  const to = toIata(p.destination);
  const pax = Math.max(1, p.passengers || 1);
  const back = !p.oneWay && p.returnDate ? p.returnDate : "";
  const o = cityName(p.origin);
  const d = cityName(p.destination);

  const gfQuery = `Voos de ${p.origin} para ${p.destination} em ${p.departDate}${back ? ` voltando em ${back}` : " somente ida"}${pax > 1 ? ` para ${pax} adultos` : ""}`;
  const codes = from && to;

  const flights: SearchLink[] = [
    {
      name: "Google Flights",
      url: `https://www.google.com/travel/flights?q=${encodeURIComponent(gfQuery)}&hl=pt-BR&curr=BRL`,
      note: "Mostra o gráfico de preços por data e permite criar alerta",
      prefilled: true,
    },
    codes
      ? {
          name: "Skyscanner",
          url: `https://www.skyscanner.com.br/transporte/passagens-aereas/${from!.toLowerCase()}/${to!.toLowerCase()}/${yymmdd(p.departDate)}/${back ? `${yymmdd(back)}/` : ""}?adultsv2=${pax}`,
          note: "Compara agências menores, que às vezes são mais baratas",
          prefilled: true,
        }
      : { name: "Skyscanner", url: "https://www.skyscanner.com.br/", note: "Informe o código do aeroporto (ex.: GRU) para abrir a busca pronta", prefilled: false },
    codes
      ? {
          name: "Kayak",
          url: `https://www.kayak.com.br/flights/${from}-${to}/${ymd(p.departDate)}${back ? `/${ymd(back)}` : ""}/${pax}adults?sort=price_a`,
          note: "Já ordenado pelo menor preço",
          prefilled: true,
        }
      : { name: "Kayak", url: "https://www.kayak.com.br/flights", prefilled: false },
    codes
      ? {
          name: "Decolar",
          url: `https://www.decolar.com/shop/flights/results/${back ? "roundtrip" : "oneway"}/${from}/${to}/${p.departDate}${back ? `/${back}` : ""}/${pax}/0/0`,
          prefilled: true,
        }
      : { name: "Decolar", url: "https://www.decolar.com/passagens-aereas/", prefilled: false },
    codes
      ? {
          name: "Momondo",
          url: `https://www.momondo.com.br/flight-search/${from}-${to}/${p.departDate}${back ? `/${back}` : ""}/${pax}adults?sort=price_a`,
          prefilled: true,
        }
      : { name: "Momondo", url: "https://www.momondo.com.br/", prefilled: false },
  ];

  const airlines: SearchLink[] = [
    codes
      ? {
          name: "LATAM",
          url: `https://www.latamairlines.com/br/pt/oferta-voos?origin=${from}&destination=${to}&outbound=${p.departDate}T12%3A00%3A00.000Z${back ? `&inbound=${back}T12%3A00%3A00.000Z&trip=RT` : "&trip=OW"}&adt=${pax}&chd=0&inf=0&cabin=Economy&redemption=false&sort=RECOMMENDED`,
          prefilled: true,
        }
      : { name: "LATAM", url: "https://www.latamairlines.com/br/pt", prefilled: false },
    { name: "GOL", url: "https://www.voegol.com.br/", note: "Confira também as tarifas em milhas no Smiles", prefilled: false },
    { name: "Azul", url: "https://www.voeazul.com.br/", note: "Azul Viagens tem pacotes com hotel", prefilled: false },
    { name: "Smiles (milhas GOL)", url: "https://www.smiles.com.br/passagens", prefilled: false },
    { name: "LATAM Pass (milhas)", url: "https://latampass.latam.com/pt_br/", prefilled: false },
    { name: "Promoções do dia", url: google(`promoção passagem aérea ${o} ${d}`), note: "Busca no Google por promoções recentes", prefilled: true },
  ];

  const so = busSlug(p.origin);
  const sd = busSlug(p.destination);
  const bus: SearchLink[] = [
    {
      name: "ClickBus",
      url: `https://www.clickbus.com.br/onibus/${so}-todos/${sd}-todos?departureDate=${p.departDate}${back ? `&returnDate=${back}` : ""}`,
      note: "Use \"Cidade, UF\" (ex.: Itajaí, SC) para a rota abrir certa",
      prefilled: true,
    },
    { name: "Quero Passagem", url: "https://queropassagem.com.br/", prefilled: false },
    { name: "Guichê Virtual", url: "https://www.guichevirtual.com.br/", prefilled: false },
    { name: "BusOn", url: "https://www.buson.com.br/", prefilled: false },
    { name: "Wemobi (low cost)", url: "https://wemobi.com.br/", note: "Ônibus low cost em várias rotas do Sul e Sudeste", prefilled: false },
    { name: "Buscar no Google", url: google(`passagem de ônibus ${o} para ${d} ${ddmmyyyy(p.departDate)}`), prefilled: true },
  ];

  const extra: SearchLink[] = [
    { name: "BlaBlaCar (carona)", url: `https://www.blablacar.com.br/search?fn=${encodeURIComponent(o)}&tn=${encodeURIComponent(d)}&db=${p.departDate}&seats=${pax}`, prefilled: true },
    { name: "Rota de carro", url: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(p.origin)}&destination=${encodeURIComponent(p.destination)}&travelmode=driving`, note: "Tempo e distância para comparar com pedágio + combustível", prefilled: true },
    { name: "Aluguel de carro", url: `https://www.rentcars.com/pt-br/`, prefilled: false },
  ];

  return [
    { key: "comparadores", title: "Comparadores de voos", icon: "🔎", description: "Buscam em várias companhias e agências ao mesmo tempo.", links: flights },
    { key: "cias", title: "Companhias aéreas e milhas", icon: "✈️", description: "Comprar direto costuma facilitar remarcação e reembolso.", links: airlines },
    { key: "onibus", title: "Ônibus", icon: "🚌", description: "Para trechos de até ~10 h o ônibus costuma sair bem mais barato.", links: bus },
    { key: "outros", title: "Outras opções", icon: "🚗", description: "Carona, carro próprio ou alugado.", links: extra },
  ];
}

export const TIPS: string[] = [
  "Pesquise com datas flexíveis: no Google Flights, o gráfico de preços mostra os dias mais baratos ao redor da sua data.",
  "Crie um alerta de preço no Google Flights ou no Kayak e compre quando cair.",
  "Para voos nacionais, compre de 1 a 3 meses antes; internacionais, de 2 a 6 meses.",
  "Terça, quarta e sábado costumam ter voos mais baratos que sexta e domingo.",
  "Considere aeroportos próximos (ex.: Navegantes x Florianópolis, Campinas x Guarulhos) e compare o custo do deslocamento.",
  "Confira se a tarifa inclui bagagem despachada: a mais barata às vezes sai mais cara no fim.",
  "Compare o preço em dinheiro com o preço em milhas (Smiles, LATAM Pass, TudoAzul).",
  "Ida e volta em companhias diferentes às vezes custa menos que o par de ida e volta na mesma.",
  "No ônibus, saídas de madrugada e no meio da semana costumam ser mais baratas e economizam uma diária.",
  "Antes de pagar numa agência, confira o mesmo voo no site da companhia: a diferença de preço pode ser pequena e o suporte é melhor.",
];
