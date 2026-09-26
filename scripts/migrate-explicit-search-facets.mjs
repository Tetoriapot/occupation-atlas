import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const occupationsDirectory = join(root, "data", "occupations");

const facetIds = {
  eras: [
    "modern",
    "taisho-1920s",
    "meiji-19c",
    "showa",
    "premodern",
    "near-future",
    "far-future",
    "fictional-era",
  ],
  regions: [
    "japan",
    "overseas",
    "urban",
    "rural",
    "mountain",
    "island",
    "maritime",
    "polar",
    "space",
    "fictional",
  ],
  situations: [
    "closed",
    "school",
    "hospital",
    "museum",
    "hotel",
    "mansion",
    "ruins",
    "outdoors",
    "urban",
    "disaster",
    "criminal-case",
    "courtroom",
    "maritime",
    "aviation",
    "space",
    "research-facility",
    "factory",
    "religious-site",
    "transport",
    "event",
    "office",
    "residential",
    "everyday",
  ],
};

const legacyEraRules = [
  { id: "modern", pattern: /現代|現在|1990年代/ },
  { id: "taisho-1920s", pattern: /大正|1910|1920|戦間期|第一次大戦後/ },
  {
    id: "meiji-19c",
    pattern: /明治|19世紀|十九世紀|ヴィクトリア|産業革命|蒸気機関|蒸気船|電気黎明|開拓時代|海洋探検時代/,
  },
  { id: "showa", pattern: /昭和|1930|1940|1950|1960|1970|高度成長|戦後復興|冷戦/ },
  { id: "premodern", pattern: /古代|中世|近世|江戸|戦国|平安|大航海|帆船/ },
  { id: "near-future", pattern: /近未来/ },
  { id: "far-future", pattern: /遠未来|宇宙世紀/ },
  { id: "fictional-era", pattern: /架空|仮想|異世界|機械幻想/ },
];

const legacyRegionRules = [
  { id: "japan", pattern: /日本/ },
  { id: "overseas", pattern: /海外|外国|国際|異文化|王国|欧州|北米|砂漠|王都|宮廷|大陸|国境|植民地|城館|砦|要塞/ },
  { id: "urban", pattern: /都市|市街|街|帝都|首都|王都|駅前|商業|工業|大学町/ },
  { id: "rural", pattern: /地方|農村|山村|漁村|田園|牧場|農地|郊外|集落/ },
  { id: "mountain", pattern: /山|高原|雪|鉱山|高地/ },
  { id: "island", pattern: /島|群島/ },
  { id: "maritime", pattern: /海上|海底|海中|海洋|海辺|外洋|霧海|港|沿岸|湾|北洋|船上|航行船/ },
  { id: "polar", pattern: /極地|南極|北極|氷原|極夜/ },
  { id: "space", pattern: /宇宙|月面|火星|木星|軌道|惑星|星間|恒星|コロニー/ },
  { id: "fictional", pattern: /架空|仮想|異世界|浮遊/ },
];

const legacySituationRules = [
  { id: "closed", pattern: /閉|密閉|封鎖|隔離|孤立|籠城|停電/ },
  { id: "school", pattern: /学校|学園|大学|校舎|教室|寄宿|学生寮/ },
  { id: "hospital", pattern: /病院|診療|医療|病棟|薬局|療養|救急|リハビリ/ },
  { id: "museum", pattern: /博物|美術|展示|文化財|収蔵|資料館|図書館|アーカイブ/ },
  { id: "hotel", pattern: /ホテル|旅館|宿泊|宴会|結婚式/ },
  { id: "mansion", pattern: /豪邸|屋敷|邸宅|宮殿/ },
  { id: "ruins", pattern: /遺跡|発掘|古墳|洞窟|廃墟|地下神殿|史跡/ },
  { id: "outdoors", pattern: /山|雪|キャンプ|森林|洞窟|遭難|野外|自然|鉱山|高原/ },
  { id: "urban", pattern: /市街|都市|繁華街|商店街|地下街|住宅街|街中/ },
  { id: "disaster", pattern: /災害|地震|洪水|火災|事故|避難|崩落|台風|被災|停電|噴火/ },
  { id: "criminal-case", pattern: /刑事|事件|捜査|犯罪|失踪|行方不明|警察|監獄|護送|張り込み|犯人/ },
  { id: "courtroom", pattern: /法廷|裁判|法律|議会|行政|公聴会/ },
  { id: "maritime", pattern: /船|海上|港|海底|海洋|孤島|漁|水族館|沿岸/ },
  { id: "aviation", pattern: /飛行|航空|空港|機内|上空|滑走路/ },
  { id: "space", pattern: /宇宙|月面|火星|軌道|惑星|ロケット/ },
  { id: "research-facility", pattern: /研究|実験|観測|ラボ|試験場|加速器|検査施設/ },
  { id: "factory", pattern: /工場|製造|生産|倉庫|印刷|試作|プラント|整備場/ },
  { id: "religious-site", pattern: /寺|神社|礼拝|祭礼|教会|宗教|霊場|別院|祭壇/ },
  { id: "transport", pattern: /駅|鉄道|列車|空港|車両|道路|橋|トンネル|タクシー|バス|運行/ },
  { id: "event", pattern: /祭|大会|会議|イベント|ライブ|公演|展示|式典|選挙|宴会|撮影|収録|合宿/ },
  { id: "office", pattern: /庁|署|企業|会社|編集|放送局|スタジオ|事務所|裁判所|議会|本部|執務/ },
  { id: "residential", pattern: /住宅|自宅|家庭|団地|豪邸|屋敷|生活支援/ },
  { id: "everyday", pattern: /地域|日常|町|店|相談|家庭|住宅|訪問|祭|学校/ },
];

function matches(text, rules) {
  return rules.flatMap(({ id, pattern }) => pattern.test(text) ? [id] : []);
}

function orderFacetIds(key, values) {
  const selected = new Set(values);
  return facetIds[key].filter((id) => selected.has(id));
}

function deriveLegacyFacets(occupation) {
  const alternativeIdeas = occupation.creativeIdeas.filter(
    ({ era, region }) =>
      !occupation.setting.eras.includes(era) || !occupation.setting.regions.includes(region),
  );
  const ideas = alternativeIdeas.length > 0 ? alternativeIdeas : occupation.creativeIdeas;
  const eraText = ideas.map(({ era }) => era).join(" ");
  const regionText = ideas.map(({ region }) => region).join(" ");
  const situationText = occupation.scenarioSituations
    .flatMap(({ title, reason }) => [title, reason])
    .join(" ");
  const situations = matches(situationText, legacySituationRules);

  return {
    eras: orderFacetIds("eras", matches(eraText, legacyEraRules)),
    regions: orderFacetIds("regions", matches(regionText, legacyRegionRules)),
    situations: orderFacetIds(
      "situations",
      situations.length > 0 ? situations : ["everyday"],
    ),
  };
}

function removeObviousPhraseCollisions(occupation, facets) {
  const situationText = occupation.scenarioSituations
    .flatMap(({ title, reason }) => [title, reason])
    .join(" ");
  const hasConcreteOutdoorCue =
    /山|雪|キャンプ|森林|洞窟|遭難|野外|鉱山|高原/.test(situationText);
  const hasConcreteTransportCue =
    /駅|鉄道|列車|空港|車両|道路|トンネル|タクシー|バス|運行/.test(situationText)
    || /橋(?!渡し)/.test(situationText);

  return {
    ...facets,
    situations: facets.situations.filter((id) => {
      if (id === "outdoors" && !hasConcreteOutdoorCue) return false;
      if (id === "transport" && !hasConcreteTransportCue) return false;
      return true;
    }),
  };
}

const rewrites = {
  "ai-engineer": {
    searchFacets: {
      eras: ["near-future"],
      regions: ["urban"],
      situations: ["urban", "research-facility", "office"],
    },
    creative: {
      investigatorFeatures: [
        "推論結果と入力データを切り分け、特定の条件だけで起きる誤判定を再現できる。",
        "学習時点、モデル版、監視ログを並べ、異常が設計・運用・外部入力のどこから入ったかを絞り込める。",
      ],
      likelyKnowledge: [
        "機械学習、モデル評価、特徴量、プログラミングに関する実務知識。",
        "データ品質、MLOps、説明可能性、AI利用時の安全と倫理。",
      ],
      roleplayTips: [
        "予測値を結論として扱わず、『何を入力し、どのモデル版が、どの確率で出したか』を確認する。",
        "モデルが答えられない範囲と人が最終判断すべき場面を明言すると、慎重な専門家らしさが出る。",
      ],
      personalityExamples: [
        "精度の高さより、失敗する条件を先に探す検証派",
        "技術の便利さと社会への影響を同時に考える慎重派",
      ],
      everydayEvents: [
        "特定の利用者群だけ判定精度が落ち、学習データの採取経路を調べ直すことになる。",
        "昨夜の自動再学習後から、監視画面に存在しないモデル版が短時間だけ表示される。",
      ],
      scenarioHooks: [
        "廃止したはずのモデルが、未来の日付を持つ推論ログを毎晩一件ずつ残す。",
        "街の複数システムが同じ人物を別人と判定し、その人物だけ記録上の移動経路が途切れる。",
      ],
      commonCharacterSettings: [
        "公平性レビューを担当し、開発チームへ都合の悪い結果も報告するAIエンジニア",
        "夜間のモデル監視を続けるうち、異常値の並びに規則性を見つけた運用担当者",
      ],
    },
    creativeIdeas: [
      {
        title: "消える乗客予測",
        summary: "現代日本。交通需要モデルが、実在する一人の乗客だけを毎日集計から除外する。AIエンジニアは入力元とモデル版を照合し、除外が始まった時刻を追う。",
        era: "現代",
        region: "日本",
      },
      {
        title: "学習する避難都市",
        summary: "近未来の大都市で、避難誘導AIが人のいない地下区画へ群衆を導こうとする。監視ログと街のセンサーを調べ、安全停止か継続運用かを判断する。",
        era: "近未来",
        region: "大都市",
      },
    ],
    scenarioSituations: [
      {
        title: "研究所の評価実験",
        reason: "評価データ、実験条件、モデル版を照合する役割があり、結果の改変や再現しない異常へ自然に関われる。",
      },
      {
        title: "スマートシティの誤作動",
        reason: "交通、防災、認証など連携するAIのログを横断し、同時多発する誤判定の共通入力を探せる。",
      },
      {
        title: "企業内の自動判定事故",
        reason: "権限と監査記録を確認しながら、誰がモデルを変更できたか、説明責任を誰が負うかを整理できる。",
      },
    ],
  },
  "building-services-engineer": {
    searchFacets: {
      eras: ["showa"],
      regions: ["urban"],
      situations: ["closed", "hospital", "hotel", "urban", "disaster"],
    },
    creative: {
      investigatorFeatures: [
        "空調・給排水・電気の系統図から、異常がどの区画へどの順番で広がったかを推測できる。",
        "天井裏や機械室の点検経路を把握し、居室からは見えない建物内部へ正当な目的で入れる。",
      ],
      likelyKnowledge: [
        "空調、換気、給排水、電気設備と中央監視に関する実務知識。",
        "負荷計算、省エネルギー、設備図面、停電・漏水時の安全確保。",
      ],
      roleplayTips: [
        "異臭や温度差を感じたら、発生場所だけでなく給気口・排気口と上下階の系統を確認する。",
        "構造安全は構造設計者、施工状態は施工担当へ尋ね、自分は空気・水・電気の流れに責任を持つ。",
      ],
      personalityExamples: [
        "機械室の音の変化に誰より早く気づく現場派",
        "快適さを支える設備を目立たないまま守る縁の下の調整役",
      ],
      everydayEvents: [
        "改修図に記載のない排気ダクトが見つかり、接続先の区画だけ室名が消されている。",
        "夜間だけ給水量が増えるのに、どの水道メーターにも使用記録が残らない。",
      ],
      scenarioHooks: [
        "無人の病棟から中央監視へ、正常な室温と在室信号が送り続けられる。",
        "ホテルの換気系統を追うと、図面上は存在しない客室から空気が戻ってくる。",
      ],
      commonCharacterSettings: [
        "古い建物の改修履歴を頭に入れた設備設計者",
        "停電事故を経験して以来、非常電源と避難経路を必ず二重確認する技術者",
      ],
    },
    creativeIdeas: [
      {
        title: "閉鎖病棟の給気口",
        summary: "現代日本。病院改修を担当する建築設備設計者が、閉鎖済み病棟へ新鮮空気が供給され続けていることに気づく。系統図をたどると、改修記録にない分岐が現れる。",
        era: "現代",
        region: "日本",
      },
      {
        title: "百貨店地下の冷風",
        summary: "昭和初期風の都市で、開店前の百貨店に季節外れの冷風が流れる。設備担当者は送風経路と電力計を追い、封鎖された地下機械室へ向かう。",
        era: "昭和初期風",
        region: "都市の百貨店",
      },
    ],
    scenarioSituations: [
      {
        title: "停電した高層ホテル",
        reason: "非常電源、排煙、給水、エレベーターの優先順位を判断し、宿泊客の安全確保と設備異常の調査を両立できる。",
      },
      {
        title: "廃病院の設備調査",
        reason: "機械室や配管経路へ入る職務上の理由があり、封鎖区画で今も動く設備の供給元を追いやすい。",
      },
      {
        title: "地下街の異臭騒ぎ",
        reason: "換気区画と空気の流れから発生源を絞り、店舗、道路、鉄道設備の担当者をつなぐ役割を持てる。",
      },
    ],
  },
  "building-surveyor": {
    searchFacets: {
      eras: ["showa"],
      regions: ["urban"],
      situations: ["mansion", "urban", "disaster", "courtroom"],
    },
    creative: {
      investigatorFeatures: [
        "申請図面、検査記録、現場寸法を照合し、無届けの増築や用途変更を見つけられる。",
        "設計者や所有者から独立した確認の立場を取り、説明の食い違いを法令と実測値へ戻して考えられる。",
      ],
      likelyKnowledge: [
        "建築確認、図面審査、現場検査、建築基準法に関する実務知識。",
        "防火区画、避難経路、用途制限、検査記録の読み方。",
      ],
      roleplayTips: [
        "図面を見たら、室名、面積、開口部、避難経路が現場と一致するか順番に確かめる。",
        "違反と断定する前に、申請時期と適用法令、改修履歴を確認すると検査員らしい慎重さが出る。",
      ],
      personalityExamples: [
        "所有者の肩書より図面と実測値を信じる独立派",
        "指摘事項を曖昧にせず、是正方法まで筋道立てて説明する実務家",
      ],
      everydayEvents: [
        "完了検査前の建物で、図面にはない階段が壁の向こうへ続いている。",
        "過去の検査済証に記された担当者名だけ、指定機関の在籍記録に存在しない。",
      ],
      scenarioHooks: [
        "取り壊す予定の屋敷が、年代の異なる三枚の確認図面すべてで同じ未検査区画を持つ。",
        "震災後の応急確認で、安全と判定された建物だけ夜ごとに一階分高くなる。",
      ],
      commonCharacterSettings: [
        "不正改修を見逃した苦い経験から現場確認を徹底する検査員",
        "設計者と対立しても利用者の安全を優先する民間確認機関の職員",
      ],
    },
    creativeIdeas: [
      {
        title: "三度検査された屋敷",
        summary: "現代日本。用途変更の検査に訪れた屋敷で、建築確認検査員は年代の違う検査済証を三通見つける。どの図面にも同じ部屋が描かれていない。",
        era: "現代",
        region: "日本",
      },
      {
        title: "復興街区の空白階",
        summary: "昭和復興期風の都市で、新築ビルの階数が申請書と住民の記憶で一致しない。検査員は施工写真と防火区画をたどり、記録から抜けた階を探す。",
        era: "昭和復興期風",
        region: "都市",
      },
    ],
    scenarioSituations: [
      {
        title: "用途変更された豪邸",
        reason: "申請用途と現況の差を確かめるため屋敷へ入り、隠された客室や塞がれた避難口を発見する導入を作れる。",
      },
      {
        title: "震災後の建物判定",
        reason: "多数の建物を短時間で見分ける立場から、被害のない建物だけに現れる共通した改修跡を追える。",
      },
      {
        title: "審査記録を巡る聴聞",
        reason: "図面、法令、検査記録を根拠として示し、所有者・設計者・行政の相反する説明を整理できる。",
      },
    ],
  },
  "civil-engineer": {
    searchFacets: {
      eras: ["taisho-1920s"],
      regions: ["rural", "mountain", "island"],
      situations: ["ruins", "outdoors", "disaster", "transport"],
    },
    creative: {
      investigatorFeatures: [
        "地形、地盤、水位、荷重の関係から、構造物へ異常が伝わった順序を推測できる。",
        "測量点、地質柱状図、設計図、施工記録を同じ座標へ重ね、前提が変わった工程を絞り込める。",
      ],
      likelyKnowledge: [
        "土木設計、構造力学、水理学、地盤に関する実務知識。",
        "道路、橋、河川、トンネルの計画と現地調査、CAD・図面読解。",
      ],
      roleplayTips: [
        "現場では地形、排水、荷重の流れを順に見て、図面どおりかを座標と寸法で確かめる。",
        "地質の断定は調査技術者へ求め、自分は設計計算の前提と安全上の余裕を明確にする。",
      ],
      personalityExamples: [
        "机上の計算だけでなく雨の日の現場も見に行く実証派",
        "便利さより、壊れたときに人が逃げられる設計を優先する安全志向",
      ],
      everydayEvents: [
        "橋脚周辺だけ河床が急に深くなり、上流の工事記録にはない水流変化が見つかる。",
        "トンネルの測点番号が一つ飛んでいるのに、掘削距離の合計だけは正しい。",
      ],
      scenarioHooks: [
        "完成前のダムへ、百年前の日付で同じ亀裂を警告する設計図が届く。",
        "崩落現場の地層断面に、人工構造物としか思えない規則的な空洞が現れる。",
      ],
      commonCharacterSettings: [
        "災害復旧を経験し、設計図へ現場で得た教訓を書き残す技術者",
        "古い橋や水路の設計思想を読み解くことに長けた土木設計者",
      ],
    },
    creativeIdeas: [
      {
        title: "川底に続く設計線",
        summary: "現代日本。河川改修の測量結果に、既存図面にはない直線状の深みが現れる。土木設計技術者は古い工事記録と水位変化を重ね、地下へ続く構造を推定する。",
        era: "現代",
        region: "日本",
      },
      {
        title: "島を二分する堰堤",
        summary: "1920年代風の離島で、建設中の堰堤が地図にない谷へ水を流し始める。技術者は測量杭と地質記録を追い、工事前から存在した水路を探す。",
        era: "1920年代風",
        region: "山がちな離島",
      },
    ],
    scenarioSituations: [
      {
        title: "豪雨後の橋梁調査",
        reason: "洗掘、ひび割れ、通行荷重を確認しながら、事故か地盤異常かを工学的な手順で切り分けられる。",
      },
      {
        title: "山岳トンネルの崩落",
        reason: "掘削記録と地質断面を使って救助経路を検討し、図面にない空洞へ至る理由を作りやすい。",
      },
      {
        title: "水没した旧土木遺構",
        reason: "現役施設へ与える影響を評価する目的で遺構を調べ、過去の設計と現在の水系を結び付けられる。",
      },
    ],
  },
  "cloud-infrastructure-engineer": {
    searchFacets: {
      eras: ["near-future"],
      regions: ["space"],
      situations: ["closed", "space", "office"],
    },
    creative: {
      investigatorFeatures: [
        "構成履歴、監視ログ、権限変更を時系列へ並べ、障害が人為操作か自動処理かを切り分けられる。",
        "複数地域へ複製されたシステムを俯瞰し、離れた場所で同時に起きた異常の共通設定を探せる。",
      ],
      likelyKnowledge: [
        "クラウド設計、構成自動化、監視、バックアップに関する実務知識。",
        "アクセス制御、障害復旧、可用性、費用と性能のトレードオフ。",
      ],
      roleplayTips: [
        "障害時は『最後に正常だった時刻』『直前の変更』『復旧可能な状態』を順に確認する。",
        "管理者権限を万能鍵として使わず、承認と操作記録を残すほど現実的な運用担当者になる。",
      ],
      personalityExamples: [
        "平穏なときほど復旧訓練を提案する備え重視の技術者",
        "眠気の中でも操作前後の画面を記録する慎重な当番担当",
      ],
      everydayEvents: [
        "削除した検証環境が毎朝同じ時刻に復元され、利用料金だけが別部署へ計上される。",
        "管理者一覧にない権限主体が、一秒未満の間だけ全データへアクセスしている。",
      ],
      scenarioHooks: [
        "三地域のバックアップが、保存した覚えのない同じ人物写真へ一斉に置き換わる。",
        "災害復旧先として指定された拠点の住所が、地図にも登記にも存在しない。",
      ],
      commonCharacterSettings: [
        "大規模障害の夜に下した判断を今も検証し続けるインフラ担当者",
        "組織の古い構成を一人だけ理解し、退職前に知識を引き継ごうとする技術者",
      ],
    },
    creativeIdeas: [
      {
        title: "復元される検証環境",
        summary: "現代日本。廃止した環境が毎朝復元される障害を追い、クラウドインフラエンジニアは構成履歴に記録されない実行主体を探す。",
        era: "現代",
        region: "日本",
      },
      {
        title: "軌道拠点の最後のバックアップ",
        summary: "近未来の軌道施設で地上回線が途絶える。残されたバックアップは、事故発生より一日後の状態を保存しており、復元するか消去するかを迫られる。",
        era: "近未来",
        region: "軌道施設",
      },
    ],
    scenarioSituations: [
      {
        title: "夜間のデータセンター障害",
        reason: "監視と復旧を担当するため閉鎖された設備区画へ入り、物理障害と不正操作を並行して調べられる。",
      },
      {
        title: "企業システムへの侵入",
        reason: "権限変更と構成履歴から侵入経路を追い、業務を止めるか証拠保全を優先するかの葛藤を作れる。",
      },
      {
        title: "宇宙施設の通信断",
        reason: "遠隔拠点の限られた計算資源とバックアップを管理し、復旧手順そのものを探索の進行へ組み込める。",
      },
    ],
  },
  "embedded-systems-engineer": {
    searchFacets: {
      eras: ["showa"],
      regions: ["urban"],
      situations: ["research-facility", "factory", "transport"],
    },
    creative: {
      investigatorFeatures: [
        "センサー入力、制御出力、ファームウェア版を照合し、機械が意図と違う動きをした条件を再現できる。",
        "ソフトウェアだけでなく熱、振動、電源、配線を調べ、物理故障と改変を横断して考えられる。",
      ],
      likelyKnowledge: [
        "組込み開発、電子回路、制御工学、リアルタイム処理の実務知識。",
        "実機試験、校正、故障解析、安全側動作、計測機器の扱い。",
      ],
      roleplayTips: [
        "機械を動かす前に電源と安全装置を確認し、入力と出力を一つずつ固定して再現試験を行う。",
        "机上のコードだけで断定せず、実機の温度や音、配線の痕跡を観察すると専門性が出る。",
      ],
      personalityExamples: [
        "現物を分解する前に波形と配線を記録する実験派",
        "便利な自動化より、異常時に安全停止できる設計を好む堅実派",
      ],
      everydayEvents: [
        "同じ製造番号の機器だけ、電源を切った後にもセンサー値を送信し続ける。",
        "校正記録は正常なのに、実機の基準位置が毎日わずかずつ地下方向へずれていく。",
      ],
      scenarioHooks: [
        "旧型制御装置のROMから、製造される前の日付を持つ修正履歴が見つかる。",
        "無人搬送車が地図にない通路を避け、何もない壁の前で緊急停止を繰り返す。",
      ],
      commonCharacterSettings: [
        "試作機を鞄に入れ、現場で測定しながら原因を追う開発者",
        "重大事故後に安全設計へ転じ、停止条件へ人一倍こだわる技術者",
      ],
    },
    creativeIdeas: [
      {
        title: "停止しない搬送車",
        summary: "現代日本。工場の無人搬送車が非常停止を受け付けず、存在しない目的地へ向かう。組込みシステムエンジニアはセンサー入力と制御出力を切り分ける。",
        era: "現代",
        region: "日本",
      },
      {
        title: "1970年代の予測装置",
        summary: "昭和の工業都市で、試験中の制御装置が機械故障を数分前に表示する。技術者は回路図と記録紙を調べ、装置が受け取る未知の信号を追う。",
        era: "1970年代風",
        region: "工業都市",
      },
    ],
    scenarioSituations: [
      {
        title: "自動化工場の暴走",
        reason: "センサー、制御盤、機械動作を対応付け、停止操作を進めながら異常入力の発生源を調べられる。",
      },
      {
        title: "交通機器の試験場",
        reason: "実機試験と安全確認を職務として行い、再現条件の限られた事故へ自然に立ち会える。",
      },
      {
        title: "封鎖研究室の試作機",
        reason: "仕様書と回路を読めるため、開発者が残した意図と実機に加えられた改変を区別しやすい。",
      },
    ],
  },
  "interior-designer": {
    searchFacets: {
      eras: ["showa"],
      regions: ["urban"],
      situations: ["museum", "hotel", "mansion"],
    },
    creative: {
      investigatorFeatures: [
        "素材、照明、家具配置、生活動線から、部屋が本来どのように使われていたかを読み取れる。",
        "仕上げの年代や施工痕を観察し、壁や床の裏に隠された改装箇所を見つけやすい。",
      ],
      likelyKnowledge: [
        "室内計画、色彩、照明、家具、仕上げ材に関する実務知識。",
        "採寸、模型・図面制作、顧客への聞き取り、施工担当との調整。",
      ],
      roleplayTips: [
        "部屋へ入ったら、誰がどこから入り、何を見て、どこで立ち止まる設計かを口に出してみる。",
        "好みだけで語らず、光、音、素材、身体寸法を根拠に提案するとデザイナーらしくなる。",
      ],
      personalityExamples: [
        "人が無意識に選ぶ席や動線を観察する聞き上手",
        "古い素材を捨てず、空間の記憶として再利用する発想家",
      ],
      everydayEvents: [
        "改装前の採寸ではなかったはずの壁が、翌日の図面にだけ寸法付きで記録されている。",
        "依頼主が指定した家具配置を再現すると、部屋のどこからも鏡に映らない一席ができる。",
      ],
      scenarioHooks: [
        "閉館後の展示室で、来館者の動線を誘導するように家具が少しずつ移動する。",
        "老舗ホテルの改修で、内装の層を剥がすたび同じ客室が別の年代の姿で現れる。",
      ],
      commonCharacterSettings: [
        "建物の来歴を残す改修を得意とするインテリアデザイナー",
        "利用者観察から言葉にならない要望を拾う空間設計者",
      ],
    },
    creativeIdeas: [
      {
        title: "鏡に映らない応接席",
        summary: "現代日本。旧邸宅の改装で、どの鏡からも見えない一席が設計図どおりに現れる。インテリアデザイナーは仕上げの層と家具の来歴を調べる。",
        era: "現代",
        region: "日本",
      },
      {
        title: "ホテル七号室の四つの内装",
        summary: "昭和初期風の都市ホテルで、改修中の一室から年代の異なる壁紙が順番に現れる。採寸すると、剥がすたび室内がわずかに広がっている。",
        era: "昭和初期風",
        region: "都市ホテル",
      },
    ],
    scenarioSituations: [
      {
        title: "改装中の豪邸",
        reason: "採寸と素材確認のため各室へ入り、増築履歴や生活動線から隠された用途を推測できる。",
      },
      {
        title: "閉館後の美術館",
        reason: "展示空間の照明と鑑賞動線を調べる立場があり、作品と観客の位置関係に潜む仕掛けを見つけやすい。",
      },
      {
        title: "営業を続ける老舗ホテル",
        reason: "宿泊客へ配慮しながら段階的に改修する過程で、部屋ごとに異なる証言と内装年代を照合できる。",
      },
    ],
  },
  "it-project-manager": {
    searchFacets: {
      eras: ["near-future"],
      regions: ["urban", "maritime"],
      situations: ["urban", "disaster", "office"],
    },
    creative: {
      investigatorFeatures: [
        "議事録、承認履歴、担当表をつなぎ、誰が何を知った時点で判断を変えたかを整理できる。",
        "技術・予算・契約の担当者を集め、専門分野をまたぐ証言の矛盾を合意事項へ戻して検証できる。",
      ],
      likelyKnowledge: [
        "計画管理、要件整理、リスク管理、予算と契約に関する実務知識。",
        "会議運営、利害調整、進捗可視化、障害時の意思決定と引き継ぎ。",
      ],
      roleplayTips: [
        "問題が起きたら、担当者を責める前に『決定者・期限・依存先・未確認事項』を一覧にする。",
        "自分で全て解決せず、誰の専門判断が必要かを示して発言を引き出すと調整役らしさが出る。",
      ],
      personalityExamples: [
        "混乱した会議でも未決事項を拾い続ける進行役",
        "楽観的な日程に反対し、撤退条件まで先に決める現実派",
      ],
      everydayEvents: [
        "全員が承認済みだと記憶する仕様変更に、決裁者だけが記録されていない。",
        "退職した担当者のアカウントから、未来の会議日程を含む議事録が共有される。",
      ],
      scenarioHooks: [
        "複数企業が別々に開発した機能へ、同じ未公開の要件文が紛れ込んでいる。",
        "災害対応システムの切替判断だけが毎回遅れ、会議録には存在しない参加者の反対意見が残る。",
      ],
      commonCharacterSettings: [
        "炎上案件の立て直しを任され、失われた意思決定を掘り起こすPM",
        "技術者と非技術者の双方から本音を引き出す調整型の責任者",
      ],
    },
    creativeIdeas: [
      {
        title: "出席者のいない承認会議",
        summary: "現代日本。重大な仕様変更が正式承認されているのに、会議へ出た者が一人もいない。ITプロジェクトマネージャーは予定、議事録、権限履歴を照合する。",
        era: "現代",
        region: "日本",
      },
      {
        title: "海上都市の統合期限",
        summary: "近未来の海上都市で、防災システム統合の直前に各社の仕様が食い違う。PMは限られた時間で責任範囲を確定し、意図的に残された接続先を探す。",
        era: "近未来",
        region: "海上都市",
      },
    ],
    scenarioSituations: [
      {
        title: "企業横断の障害対策室",
        reason: "複数組織の担当、権限、時系列を整理し、互いに責任を押し付ける状況でも調査を前進させられる。",
      },
      {
        title: "都市インフラ切替の前夜",
        reason: "停止と継続のリスクを比較し、技術情報と住民への影響を一つの意思決定へまとめる役割を持てる。",
      },
      {
        title: "災害対応システムの混乱",
        reason: "連絡経路と未完了作業を可視化し、現場救援を妨げる仕様変更がどこで決まったかを追跡できる。",
      },
    ],
  },
  "land-surveyor": {
    searchFacets: {
      eras: ["meiji-19c"],
      regions: ["rural", "mountain"],
      situations: ["ruins", "outdoors", "disaster"],
    },
    creative: {
      investigatorFeatures: [
        "座標、高さ、方位を再測定し、移動した境界標や地図と現地のずれを数値で示せる。",
        "古地図、登記資料、基準点を結び、地形改変や土地利用の変化を空間的に復元できる。",
      ],
      likelyKnowledge: [
        "測地測量、GNSS、基準点、地図作成に関する実務知識。",
        "三次元点群、境界確認、測量法、山野での安全な現地作業。",
      ],
      roleplayTips: [
        "目印だけを信じず、基準点から距離・角度・高さを取り直して位置を確定する。",
        "境界問題では一方の記憶を採用せず、資料と立会い結果を区別して記録すると専門性が出る。",
      ],
      personalityExamples: [
        "同じ地点を季節を変えて測り直す粘り強い現場派",
        "土地の思い出を尊重しつつ、座標の事実は曲げない中立派",
      ],
      everydayEvents: [
        "昨日設置した測量杭が一直線に数センチ移動し、周囲の地面には掘り返した跡がない。",
        "衛星測位と既知点の双方が正しいのに、山村全体の座標だけ夜ごとにずれていく。",
      ],
      scenarioHooks: [
        "古地図にない集落が測量成果へ現れ、現地では住民が百年前から住んでいると主張する。",
        "災害復旧測量で見つけた基準点に、まだ制定されていない座標系の数値が刻まれている。",
      ],
      commonCharacterSettings: [
        "山間部の旧基準点を探し歩くことに慣れた測量士",
        "境界紛争で双方の信頼を失いながらも記録を守った実務家",
      ],
    },
    creativeIdeas: [
      {
        title: "夜ごと移る境界線",
        summary: "現代日本。宅地測量の杭が毎夜同じ方向へ移る。測量士が周辺基準点を再測すると、移動しているのは杭ではなく街区全体だと分かる。",
        era: "現代",
        region: "日本",
      },
      {
        title: "開拓地の零番基準点",
        summary: "明治開拓期風の山村で、地図作成中の測量士が台帳にない零番の基準点を発見する。その座標は、山の内部を示している。",
        era: "明治開拓期風",
        region: "山村",
      },
    ],
    scenarioSituations: [
      {
        title: "山村の境界争い",
        reason: "古地図と現地測量を使い、住民の記憶が一致しない土地の来歴を中立的な立場から追える。",
      },
      {
        title: "遺跡周辺の緊急測量",
        reason: "発掘地点と周辺構造を正確な座標へ落とし込み、地下空間や地形の不自然な配置を可視化できる。",
      },
      {
        title: "土砂災害後の復旧現場",
        reason: "失われた道路や境界を復元する作業から、災害前にはなかった地形と基準点を発見する導入を作れる。",
      },
    ],
  },
  "network-engineer": {
    searchFacets: {
      eras: ["near-future"],
      regions: ["island", "maritime"],
      situations: ["closed", "hospital", "maritime", "transport", "office"],
    },
    creative: {
      investigatorFeatures: [
        "通信経路、遅延、パケット記録から、情報がどこを通り、どこで失われたかを追跡できる。",
        "論理構成と物理配線を照合し、遠隔操作だけでは見えない抜線・迂回・未知機器を発見しやすい。",
      ],
      likelyKnowledge: [
        "ネットワーク設計、ルーティング、パケット解析、無線通信の実務知識。",
        "障害切り分け、冗長化、構成管理、配線と通信機器の現地確認。",
      ],
      roleplayTips: [
        "通信障害では端末、区間、経路を一つずつ切り分け、正常な地点を基準に範囲を狭める。",
        "『つながらない』だけでなく、いつ・誰から・どこまで届くかを質問すると専門家らしくなる。",
      ],
      personalityExamples: [
        "疎通が戻っても原因が分かるまで監視を続ける追究派",
        "複雑な構成を一本の経路図にして説明する可視化好き",
      ],
      everydayEvents: [
        "社内に存在しない機器が経路情報を広告し、通信が数秒だけその場所を経由する。",
        "切断されたはずの海底回線から、古い時刻同期信号が一定間隔で届き続ける。",
      ],
      scenarioHooks: [
        "病院の隔離ネットワークへ、建物外からではなく未使用病室から通信が入ってくる。",
        "島内通信が途絶えた直後、住民全員の端末に同じ未知の接続先が登録される。",
      ],
      commonCharacterSettings: [
        "障害現場へ測定器と予備ケーブルを持って駆け付けるネットワーク担当者",
        "古い構内配線を知る最後の技術者として再調査を依頼された元社員",
      ],
    },
    creativeIdeas: [
      {
        title: "未使用病室のアクセスポイント",
        summary: "現代日本。病院ネットワークに未登録機器が現れ、位置を追うと封鎖病室へ行き着く。ネットワークエンジニアは論理経路と実配線を照合する。",
        era: "現代",
        region: "日本",
      },
      {
        title: "海底回線が選ぶ島",
        summary: "近未来の群島で、切断された海底回線が一つの無人島へだけ通信を迂回させる。技術者は中継設備を巡り、未知の経路広告を止めようとする。",
        era: "近未来",
        region: "群島海域",
      },
    ],
    scenarioSituations: [
      {
        title: "封鎖病院の通信障害",
        reason: "隔離された医療ネットワークの経路と実配線を追い、人が入れない区画から届く通信を調べられる。",
      },
      {
        title: "無人島の中継局",
        reason: "島間通信を復旧する明確な目的があり、限られた交通手段で遠隔設備へ向かう導入を作りやすい。",
      },
      {
        title: "駅ネットワークの時刻ずれ",
        reason: "案内、監視、運行系の通信を切り分け、同じ誤時刻が複数設備へ広がった経路を追跡できる。",
      },
    ],
  },
  "structural-engineer": {
    searchFacets: {
      eras: ["showa"],
      regions: ["urban"],
      situations: ["mansion", "ruins", "disaster"],
    },
    creative: {
      investigatorFeatures: [
        "ひび割れ、変形、荷重の流れから、建物のどの部材が先に異常を受けたかを推測できる。",
        "構造図、計算書、施工記録を照合し、骨組みに加えられた変更と安全余裕を評価できる。",
      ],
      likelyKnowledge: [
        "構造力学、構造計算、耐震設計、建築材料に関する実務知識。",
        "図面読解、劣化調査、荷重評価、応急危険度判断の考え方。",
      ],
      roleplayTips: [
        "亀裂を見たら幅だけでなく向き、位置、周辺部材を確認し、力がどこへ流れたかを考える。",
        "安全を断言せず、確認できた範囲と立入制限の理由を具体的に示すと説得力が出る。",
      ],
      personalityExamples: [
        "見栄えより骨組みの素直さを好む合理派",
        "危険を伝えるときほど落ち着き、退避の根拠を示す責任感の強い人",
      ],
      everydayEvents: [
        "設計荷重を超えていない床が毎晩同じ方向へたわみ、朝には元へ戻っている。",
        "耐震補強の現場で、図面にない柱だけ新築時と同じ強度を保っている。",
      ],
      scenarioHooks: [
        "解体予定の塔が、部材を外すほど構造計算上は安定していく。",
        "地震後の建物群で、同じ設計者の建物だけ揺れた方向と直角に亀裂が走る。",
      ],
      commonCharacterSettings: [
        "古建築の骨組みを現代の安全基準と両立させる構造設計者",
        "倒壊事故の調査経験から、楽観的な安全宣言を避ける技術者",
      ],
    },
    creativeIdeas: [
      {
        title: "軽くなる解体塔",
        summary: "現代日本。解体中の塔が部材を外すたび安定し、計算と逆の挙動を示す。構造設計者は荷重経路と古い補修図をたどる。",
        era: "現代",
        region: "日本",
      },
      {
        title: "復興ビルの十三本目",
        summary: "昭和復興期風の都市で、十二本柱の建物に十三本目の荷重反応が現れる。構造設計者が壁を調べると、図面のない柱が振動している。",
        era: "昭和復興期風",
        region: "都市",
      },
    ],
    scenarioSituations: [
      {
        title: "地震後の高層建物",
        reason: "立入可能範囲を判断しながら変形と亀裂を調べ、通常の地震応答では説明できない力の向きを見つけられる。",
      },
      {
        title: "解体中の廃墟",
        reason: "構造図と実際の骨組みを比較するため内部へ入り、撤去しても残る未知の支持構造を追える。",
      },
      {
        title: "増築を重ねた豪邸",
        reason: "年代ごとの骨組みと荷重を読み分け、屋敷のどの部分が後から隠されたかを構造面から推測できる。",
      },
    ],
  },
  "urban-planner": {
    searchFacets: {
      eras: ["showa"],
      regions: ["urban"],
      situations: ["urban", "disaster", "courtroom", "everyday"],
    },
    creative: {
      investigatorFeatures: [
        "旧版地図、土地利用、人口統計、移動経路を重ね、街が変わった順序と取り残された場所を見つけられる。",
        "住民、事業者、行政の異なる利害を聞き、技術的には成立しても合意形成で止まった計画を読み解ける。",
      ],
      likelyKnowledge: [
        "都市計画、土地利用、地理情報、交通計画に関する実務知識。",
        "統計調査、法令読解、住民対話、公聴会と事業評価。",
      ],
      roleplayTips: [
        "現地を歩く前に旧版地図、用途地域、避難経路を重ね、地図にない生活動線を住民へ尋ねる。",
        "誰が利益を得て誰の移動が難しくなるかを比較案ごとに言葉へすると調整役らしさが出る。",
      ],
      personalityExamples: [
        "数字の平均より、地図から外れた一人の移動を気に掛ける計画家",
        "対立する住民意見を消さず、複数案へ整理する粘り強い調整役",
      ],
      everydayEvents: [
        "再開発区域の住民票は減っていないのに、昼夜人口の観測だけ毎月ゼロへ近づく。",
        "廃止された路地が最新の避難シミュレーションで最も多く利用されている。",
      ],
      scenarioHooks: [
        "都市計画図から消えた街区に、公共料金と選挙人名簿の記録だけが残り続ける。",
        "公聴会で全員が反対した道路案が、翌朝には全会一致の承認記録へ変わっている。",
      ],
      commonCharacterSettings: [
        "再開発で失われる路地と住民の記憶を記録する都市計画家",
        "災害復興計画を担当し、効率と地域共同体の間で悩むコンサルタント",
      ],
    },
    creativeIdeas: [
      {
        title: "地図から消えた一街区",
        summary: "現代日本。再開発調査で、統計には住民がいるのに地図から消えた街区が見つかる。都市計画コンサルタントは旧版地図と生活動線を追う。",
        era: "現代",
        region: "日本",
      },
      {
        title: "高度成長都市の逆向き道路",
        summary: "高度成長期風の都市で、新設道路が朝夕だけ計画と逆方向へ混雑する。住民聞き取りと交通量を重ねると、地図にない工場門へ流れが集まっていた。",
        era: "高度成長期風",
        region: "都市",
      },
    ],
    scenarioSituations: [
      {
        title: "再開発予定の市街地",
        reason: "地権者、住民、行政の資料と証言を横断し、地図から消された土地利用や移転記録を調べられる。",
      },
      {
        title: "災害復興計画の公聴会",
        reason: "避難、安全、生活再建の優先順位を整理し、対立する案の背後にある不自然な前提を明らかにできる。",
      },
      {
        title: "日常動線が変わる町",
        reason: "通学、買い物、通勤といった普段の移動を観察し、住民だけが避ける場所を街全体の変化として捉えられる。",
      },
    ],
  },
};

function withFacetPropertyAfterCategory(occupation) {
  const ordered = {};
  for (const [key, value] of Object.entries(occupation)) {
    ordered[key] = value;
    if (key === "categoryId") ordered.searchFacets = occupation.searchFacets;
  }
  return ordered;
}

function insertFacetProperty(raw, facets) {
  const match = /"categoryId"\s*:\s*"[^"]+"\s*,/.exec(raw);
  if (!match) throw new Error("categoryIdの直後へsearchFacetsを挿入できません");

  const end = match.index + match[0].length;
  const nextLineBreak = raw.indexOf("\n", end);
  const lineTail = raw.slice(end, nextLineBreak === -1 ? raw.length : nextLineBreak);
  const compactLine = lineTail.trim() !== "";
  const newline = raw.includes("\r\n") ? "\r\n" : "\n";
  const serialized = JSON.stringify(facets);
  const insertion = compactLine
    ? `"searchFacets":${serialized},`
    : `${newline}  "searchFacets": ${serialized},`;

  return `${raw.slice(0, end)}${insertion}${raw.slice(end)}`;
}

const files = (await readdir(occupationsDirectory))
  .filter((file) => file.endsWith(".json"))
  .sort();
let migratedCount = 0;
let rewrittenCount = 0;

for (const file of files) {
  const path = join(occupationsDirectory, file);
  const raw = await readFile(path, "utf8");
  const occupation = JSON.parse(raw);
  const hadExplicitFacets = occupation.searchFacets !== undefined;

  if (!hadExplicitFacets) {
    occupation.searchFacets = removeObviousPhraseCollisions(
      occupation,
      deriveLegacyFacets(occupation),
    );
    migratedCount += 1;
  }

  const rewrite = rewrites[occupation.slug];
  if (rewrite) {
    occupation.searchFacets = rewrite.searchFacets;
    occupation.creative = rewrite.creative;
    occupation.creativeIdeas = rewrite.creativeIdeas;
    occupation.scenarioSituations = rewrite.scenarioSituations;
    occupation.updatedAt = "2026-07-26";
    occupation.lastReviewedAt = "2026-07-26";
    await writeFile(
      path,
      `${JSON.stringify(withFacetPropertyAfterCategory(occupation), null, 2)}\n`,
      "utf8",
    );
    rewrittenCount += 1;
  } else if (!hadExplicitFacets) {
    await writeFile(path, insertFacetProperty(raw, occupation.searchFacets), "utf8");
  }
}

console.log(
  `searchFacetsを${migratedCount}件へ追加し、定型的な創作情報を${rewrittenCount}件で書き換えました。`,
);
