import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

type Position = [number, number]
type Ring = Position[]
type PolygonRings = Ring[]
type Geometry =
  | { type: 'Polygon'; coordinates: PolygonRings }
  | { type: 'MultiPolygon'; coordinates: PolygonRings[] }

type Feature = {
  type: 'Feature'
  geometry: Geometry
  properties?: Record<string, unknown>
}

type FeatureCollection = {
  type: 'FeatureCollection'
  features: Feature[]
}

type ProjectFn = (point: Position) => THREE.Vector2

// 景点数据（包含5A和4A级，以及自然地理）
type Attraction = {
  name: string
  city: string
  county: string
  level: '5A' | '4A' | '自然' // 景点级别或类型
  type?: '山脉' | '河流' | '湖泊' | '湿地' // 自然地理类型
}

// 生成导航链接（高德地图搜索）
const buildNavUrl = (a: Attraction) => {
  const keyword = `${a.name} ${a.city}${a.county ? ' ' + a.county : ''}`
  return `https://uri.amap.com/search?keyword=${encodeURIComponent(keyword)}`
}

const attractions: Attraction[] = [
  // 5A级景点
  { name: '承德避暑山庄及周围寺庙景区', city: '承德', county: '双桥区', level: '5A' },
  { name: '金山岭长城', city: '承德', county: '滦平县', level: '5A' },
  { name: '安新白洋淀景区', city: '保定', county: '安新县', level: '5A' },
  { name: '涞水野三坡景区', city: '保定', county: '涞水县', level: '5A' },
  { name: '涞源白石山景区', city: '保定', county: '涞源县', level: '5A' },
  { name: '易县清西陵景区', city: '保定', county: '易县', level: '5A' },
  { name: '山海关景区', city: '秦皇岛', county: '山海关区', level: '5A' },
  { name: '清东陵景区', city: '唐山', county: '遵化市', level: '5A' },
  { name: '唐山国际旅游岛', city: '唐山', county: '乐亭县', level: '5A' },
  { name: '西柏坡景区', city: '石家庄', county: '平山县', level: '5A' },
  { name: '娲皇宫景区', city: '邯郸', county: '涉县', level: '5A' },
  
  // 4A级景点 - 石家庄市
  { name: '正定隆兴寺、荣国府', city: '石家庄', county: '正定县', level: '4A' },
  { name: '赵州桥', city: '石家庄', county: '赵县', level: '4A' },
  { name: '嶂石岩', city: '石家庄', county: '赞皇县', level: '4A' },
  { name: '天桂山', city: '石家庄', county: '平山县', level: '4A' },
  { name: '驼梁', city: '石家庄', county: '平山县', level: '4A' },
  { name: '苍岩山', city: '石家庄', county: '井陉县', level: '4A' },
  { name: '沕沕水', city: '石家庄', county: '平山县', level: '4A' },
  { name: '抱犊寨', city: '石家庄', county: '鹿泉区', level: '4A' },
  { name: '河北省博物院', city: '石家庄', county: '长安区', level: '4A' },
  
  // 4A级景点 - 承德市
  { name: '塞罕坝国家森林公园', city: '承德', county: '围场满族蒙古族自治县', level: '4A' },
  { name: '御道口草原森林风景区', city: '承德', county: '围场满族蒙古族自治县', level: '4A' },
  { name: '兴隆溶洞', city: '承德', county: '兴隆县', level: '4A' },
  { name: '双塔山', city: '承德', county: '双滦区', level: '4A' },
  { name: '京北第一草原（大汗行宫）', city: '承德', county: '丰宁满族自治县', level: '4A' },
  { name: '蟠龙湖', city: '承德', county: '宽城满族自治县', level: '4A' },
  { name: '普宁寺、普陀宗乘之庙等', city: '承德', county: '双桥区', level: '4A' },
  
  // 4A级景点 - 张家口市
  { name: '张北草原天路', city: '张家口', county: '张北县', level: '4A' },
  { name: '万龙滑雪场、太舞滑雪小镇等', city: '张家口', county: '崇礼区', level: '4A' },
  { name: '大境门', city: '张家口', county: '桥西区', level: '4A' },
  { name: '蔚县暖泉古镇', city: '张家口', county: '蔚县', level: '4A' },
  { name: '飞狐峪-空中草原', city: '张家口', county: '蔚县', level: '4A' },
  { name: '沽源天鹅湖', city: '张家口', county: '沽源县', level: '4A' },
  { name: '怀来黄龙山庄', city: '张家口', county: '怀来县', level: '4A' },
  { name: '阳原泥河湾考古遗址', city: '张家口', county: '阳原县', level: '4A' },
  
  // 4A级景点 - 秦皇岛市
  { name: '鸽子窝公园、碧螺塔酒吧公园', city: '秦皇岛', county: '北戴河区', level: '4A' },
  { name: '乐岛海洋王国', city: '秦皇岛', county: '山海关区', level: '4A' },
  { name: '渔岛海洋温泉、沙雕海洋乐园', city: '秦皇岛', county: '北戴河新区', level: '4A' },
  { name: '仙螺岛', city: '秦皇岛', county: '北戴河区', level: '4A' },
  { name: '祖山风景区', city: '秦皇岛', county: '青龙满族自治县', level: '4A' },
  { name: '昌黎黄金海岸', city: '秦皇岛', county: '昌黎县', level: '4A' },
  { name: '山海关长寿山、角山', city: '秦皇岛', county: '山海关区', level: '4A' },
  
  // 4A级景点 - 唐山市
  { name: '南湖生态旅游风景区', city: '唐山', county: '路南区', level: '4A' },
  { name: '开滦国家矿山公园', city: '唐山', county: '路南区', level: '4A' },
  { name: '滦州古城', city: '唐山', county: '滦州市', level: '4A' },
  { name: '青山关', city: '唐山', county: '迁西县', level: '4A' },
  { name: '白羊峪长城', city: '唐山', county: '迁安市', level: '4A' },
  { name: '曹妃甸湿地', city: '唐山', county: '曹妃甸区', level: '4A' },
  { name: '李大钊纪念馆及故居', city: '唐山', county: '乐亭县', level: '4A' },
  { name: '景忠山', city: '唐山', county: '迁西县', level: '4A' },
  { name: '多玛乐园', city: '唐山', county: '曹妃甸区', level: '4A' },
  
  // 4A级景点 - 廊坊市
  { name: '天下第一城', city: '廊坊', county: '香河县', level: '4A' },
  { name: '金钥匙家居会展中心', city: '廊坊', county: '香河县', level: '4A' },
  { name: '茗汤温泉度假村', city: '廊坊', county: '固安县', level: '4A' },
  { name: '梦东方未来世界', city: '廊坊', county: '三河市', level: '4A' },
  
  // 4A级景点 - 保定市
  { name: '狼牙山', city: '保定', county: '易县', level: '4A' },
  { name: '直隶总督署、古莲花池', city: '保定', county: '莲池区', level: '4A' },
  { name: '满城汉墓', city: '保定', county: '满城区', level: '4A' },
  { name: '曲阳北岳庙、虎山', city: '保定', county: '曲阳县', level: '4A' },
  { name: '阜平天生桥', city: '保定', county: '阜平县', level: '4A' },
  { name: '易水湖', city: '保定', county: '易县', level: '4A' },
  { name: '清河太行水镇', city: '保定', county: '易县', level: '4A' },
  { name: '晋察冀边区革命纪念馆', city: '保定', county: '阜平县', level: '4A' },
  
  // 4A级景点 - 沧州市
  { name: '吴桥杂技大世界', city: '沧州', county: '吴桥县', level: '4A' },
  { name: '沧州铁狮子', city: '沧州', county: '沧县', level: '4A' },
  { name: '东光铁佛寺', city: '沧州', county: '东光县', level: '4A' },
  { name: '河间府署', city: '沧州', county: '河间市', level: '4A' },
  { name: '南大港湿地', city: '沧州', county: '渤海新区南大港产业园区', level: '4A' },
  
  // 4A级景点 - 衡水市
  { name: '衡水湖', city: '衡水', county: '桃城区', level: '4A' },
  { name: '武强年画博物馆', city: '衡水', county: '武强县', level: '4A' },
  { name: '闾里古镇（孙敬学堂）', city: '衡水', county: '滨湖新区', level: '4A' },
  { name: '周窝音乐小镇', city: '衡水', county: '武强县', level: '4A' },
  
  // 4A级景点 - 邢台市
  { name: '崆山白云洞', city: '邢台', county: '临城县', level: '4A' },
  { name: '邢台大峡谷、天河山', city: '邢台', county: '信都区', level: '4A' },
  { name: '前南峪生态旅游区', city: '邢台', county: '信都区', level: '4A' },
  { name: '德龙钢铁文化园', city: '邢台', county: '信都区', level: '4A' },
  { name: '扁鹊庙', city: '邢台', county: '内丘县', level: '4A' },
  { name: '内丘邢窑遗址', city: '邢台', county: '内丘县', level: '4A' },
  { name: '沙河金沙河面业景区', city: '邢台', county: '沙河市', level: '4A' },
  
  // 4A级景点 - 邯郸市
  { name: '广府古城', city: '邯郸', county: '永年区', level: '4A' },
  { name: '响堂山石窟', city: '邯郸', county: '峰峰矿区', level: '4A' },
  { name: '丛台公园', city: '邯郸', county: '丛台区', level: '4A' },
  { name: '太行五指山、八路军一二九师旧址', city: '邯郸', county: '涉县', level: '4A' },
  { name: '京娘湖、七步沟、古武当山', city: '邯郸', county: '武安市', level: '4A' },
  { name: '朝阳沟', city: '邯郸', county: '武安市', level: '4A' },
  { name: '长寿村', city: '邯郸', county: '武安市', level: '4A' },
  { name: '赵王城遗址公园', city: '邯郸', county: '邯山区', level: '4A' },
  { name: '粮画小镇', city: '邯郸', county: '馆陶县', level: '4A' },
  
  // 4A级景点 - 定州市
  { name: '定州开元寺塔（定州塔）、贡院、文庙', city: '定州', county: '定州市', level: '4A' },
  
  // 自然地理 - 山脉
  { name: '小五台山', city: '张家口', county: '蔚县', level: '自然', type: '山脉' },
  { name: '雾灵山', city: '承德', county: '兴隆县', level: '自然', type: '山脉' },
  { name: '海坨山', city: '张家口', county: '赤城县', level: '自然', type: '山脉' },
  { name: '祖山', city: '秦皇岛', county: '青龙满族自治县', level: '自然', type: '山脉' },
  { name: '白石山', city: '保定', county: '涞源县', level: '自然', type: '山脉' },
  { name: '狼牙山', city: '保定', county: '易县', level: '自然', type: '山脉' },
  { name: '天生桥', city: '保定', county: '阜平县', level: '自然', type: '山脉' },
  { name: '苍岩山', city: '石家庄', county: '井陉县', level: '自然', type: '山脉' },
  { name: '天桂山', city: '石家庄', county: '平山县', level: '自然', type: '山脉' },
  { name: '嶂石岩', city: '石家庄', county: '赞皇县', level: '自然', type: '山脉' },
  { name: '崆山白云洞', city: '邢台', county: '临城县', level: '自然', type: '山脉' },
  { name: '凌霄山', city: '邢台', county: '内丘县', level: '自然', type: '山脉' },
  { name: '邢台大峡谷', city: '邢台', county: '信都区', level: '自然', type: '山脉' },
  { name: '天河山', city: '邢台', county: '信都区', level: '自然', type: '山脉' },
  { name: '紫金山', city: '邢台', county: '信都区', level: '自然', type: '山脉' },
  { name: '云梦山', city: '邢台', county: '信都区', level: '自然', type: '山脉' },
  { name: '京娘湖（山）', city: '邯郸', county: '武安市', level: '自然', type: '山脉' },
  { name: '古武当山', city: '邯郸', county: '武安市', level: '自然', type: '山脉' },
  { name: '太行五指山', city: '邯郸', county: '涉县', level: '自然', type: '山脉' },
  { name: '韩王山', city: '邯郸', county: '涉县', level: '自然', type: '山脉' },
  { name: '响堂山', city: '邯郸', county: '峰峰矿区', level: '自然', type: '山脉' },
  
  // 自然地理 - 河流
  { name: '潮河', city: '承德', county: '丰宁满族自治县', level: '自然', type: '河流' },
  { name: '闪电河（滦河源）', city: '张家口', county: '沽源县', level: '自然', type: '河流' },
  { name: '伊逊河', city: '承德', county: '围场满族蒙古族自治县', level: '自然', type: '河流' },
  { name: '武烈河', city: '承德', county: '围场满族蒙古族自治县', level: '自然', type: '河流' },
  { name: '瀑河', city: '承德', county: '宽城满族自治县', level: '自然', type: '河流' },
  { name: '青龙河', city: '秦皇岛', county: '青龙满族自治县', level: '自然', type: '河流' },
  { name: '永定河', city: '张家口', county: '怀安县', level: '自然', type: '河流' },
  { name: '桑干河', city: '张家口', county: '阳原县', level: '自然', type: '河流' },
  { name: '洋河', city: '张家口', county: '尚义县', level: '自然', type: '河流' },
  { name: '妫水河', city: '张家口', county: '怀来县', level: '自然', type: '河流' },
  { name: '清水河', city: '张家口', county: '桥西区', level: '自然', type: '河流' },
  { name: '拒马河', city: '保定', county: '涞源县', level: '自然', type: '河流' },
  { name: '易水河', city: '保定', county: '易县', level: '自然', type: '河流' },
  { name: '漕河', city: '保定', county: '易县', level: '自然', type: '河流' },
  { name: '唐河', city: '保定', county: '涞源县', level: '自然', type: '河流' },
  { name: '沙河', city: '石家庄', county: '灵寿县', level: '自然', type: '河流' },
  { name: '滹沱河', city: '石家庄', county: '平山县', level: '自然', type: '河流' },
  { name: '冶河', city: '石家庄', county: '井陉县', level: '自然', type: '河流' },
  { name: '槐河', city: '石家庄', county: '赞皇县', level: '自然', type: '河流' },
  { name: '泜河', city: '邢台', county: '临城县', level: '自然', type: '河流' },
  { name: '滏阳河', city: '邯郸', county: '峰峰矿区', level: '自然', type: '河流' },
  { name: '漳河', city: '邯郸', county: '涉县', level: '自然', type: '河流' },
  { name: '清漳河', city: '邯郸', county: '涉县', level: '自然', type: '河流' },
  { name: '浊漳河', city: '邯郸', county: '涉县', level: '自然', type: '河流' },
  { name: '南运河', city: '衡水', county: '故城县', level: '自然', type: '河流' },
  { name: '子牙河', city: '沧州', county: '献县', level: '自然', type: '河流' },
  { name: '老哈河（西辽河源）', city: '承德', county: '围场满族蒙古族自治县', level: '自然', type: '河流' },
  
  // 自然地理 - 湖泊/水库
  { name: '衡水湖', city: '衡水', county: '桃城区', level: '自然', type: '湖泊' },
  { name: '官厅水库', city: '张家口', county: '怀来县', level: '自然', type: '湖泊' },
  { name: '潘家口水库', city: '承德', county: '宽城满族自治县', level: '自然', type: '湖泊' },
  { name: '大黑汀水库', city: '唐山', county: '迁西县', level: '自然', type: '湖泊' },
  { name: '岗南水库', city: '石家庄', county: '平山县', level: '自然', type: '湖泊' },
  { name: '黄壁庄水库', city: '石家庄', county: '鹿泉区', level: '自然', type: '湖泊' },
  { name: '西大洋水库', city: '保定', county: '唐县', level: '自然', type: '湖泊' },
  { name: '王快水库', city: '保定', county: '曲阳县', level: '自然', type: '湖泊' },
  
  // 自然地理 - 湿地
  { name: '闪电河国家湿地公园', city: '张家口', county: '沽源县', level: '自然', type: '湿地' },
  { name: '南大港湿地', city: '沧州', county: '渤海新区', level: '自然', type: '湿地' },
  { name: '曹妃甸湿地', city: '唐山', county: '曹妃甸区', level: '自然', type: '湿地' },
]

type CityInfo = { a5: number; a4: number; name: string }

// 根据景点数据动态统计各市 5A/4A 数量，避免与数据源不同步
const buildCityData = (): Record<string, CityInfo> => {
  const map: Record<string, CityInfo> = {}
  attractions.forEach((a) => {
    if (a.level === '自然') return
    const current = map[a.city] ?? { a5: 0, a4: 0, name: `${a.city}市` }
    if (a.level === '5A') current.a5 += 1
    if (a.level === '4A') current.a4 += 1
    map[a.city] = current
  })
  return map
}

const cityData = buildCityData()

// 统计某市内各县区的 5A/4A 数量
const buildCountySeries = (cityName: string) => {
  const map: Record<string, { a: number; b: number; total: number }> = {}
  attractions.forEach((a) => {
    if (a.level === '自然') return
    if (a.city !== cityName) return
    const key = a.county
    const current = map[key] ?? { a: 0, b: 0, total: 0 }
    if (a.level === '5A') current.a += 1
    if (a.level === '4A') current.b += 1
    current.total = current.a + current.b
    map[key] = current
  })
  return Object.entries(map)
    .map(([label, v]) => ({ label, a: v.a, b: v.b, total: v.total }))
    .sort((x, y) => y.total - x.total || y.a - x.a)
}

// 从名称中提取城市名（去除"市"等后缀）
const extractCityName = (name: string | undefined): string | null => {
  if (!name) return null
  // 尝试匹配城市名
  for (const cityName of Object.keys(cityData)) {
    if (name.includes(cityName)) {
      return cityName
    }
  }
  return null
}

// 默认数据（全省）- 根据实际景点数据计算
const total5A = attractions.filter(a => a.level === '5A').length
const total4A = attractions.filter(a => a.level === '4A').length
const totalAttractions = total5A + total4A

const defaultLeftStats = [
  { label: '5A级景区总数', value: `${total5A} 处` },
  { label: '4A级景区总数', value: `${total4A} 处` },
  { label: '景区总数', value: `${totalAttractions} 处` },
]

const defaultStatusCards = [
  { title: '5A级景区', value: total5A, deltaMoM: '+8.33%', deltaQoQ: '+8.33%', color: '#22d3ee' },
  { title: '4A级景区', value: total4A, deltaMoM: '+5.20%', deltaQoQ: '+5.20%', color: '#a855f7' },
  { title: '总景区数', value: totalAttractions, deltaMoM: '+5.45%', deltaQoQ: '+5.45%', color: '#22c55e' },
]

// 各市5A/4A景区数量（前8个城市，按总数排序）
const defaultBarSeries = Object.entries(cityData)
  .map(([label, data]) => ({ label, a: data.a5, b: data.a4, total: data.a5 + data.a4 }))
  .sort((a, b) => b.total - a.total)
  .slice(0, 8)
  .map(({ label, a, b }) => ({ label, a, b }))

const total5APercent = totalAttractions > 0 ? (total5A / totalAttractions) * 100 : 0
const total4APercent = totalAttractions > 0 ? (total4A / totalAttractions) * 100 : 0

const defaultCircleStats = [
  { label: '5A景区占比', value: total5APercent, color: '#38bdf8' },
  { label: '4A景区占比', value: total4APercent, color: '#a855f7' },
]

const App = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const returnToProvinceRef = useRef<(() => void) | null>(null)
  const viewLevelRef = useRef<'province' | 'city'>('province')
  const titleRef = useRef<HTMLDivElement>(null)
  const legendRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState('正在加载河北省地图…')
  const [error, setError] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [viewLevel, setViewLevel] = useState<'province' | 'city'>('province') // 视图级别
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null)
  const [attractionFilter, setAttractionFilter] = useState<'all' | '5A' | '4A' | '山脉' | '河流'>('all')
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // 全屏功能
  const toggleFullscreen = async () => {
    try {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )

      if (!isCurrentlyFullscreen) {
        // 进入全屏
        const element = document.documentElement
        if (element.requestFullscreen) {
          await element.requestFullscreen()
        } else if ((element as any).webkitRequestFullscreen) {
          // Safari
          await (element as any).webkitRequestFullscreen()
        } else if ((element as any).mozRequestFullScreen) {
          // Firefox
          await (element as any).mozRequestFullScreen()
        } else if ((element as any).msRequestFullscreen) {
          // IE/Edge
          await (element as any).msRequestFullscreen()
        }
      } else {
        // 退出全屏
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen()
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen()
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen()
        }
      }
    } catch (err) {
      console.error('全屏操作失败:', err)
    }
  }

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )
      setIsFullscreen(isFull)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('msfullscreenchange', handleFullscreenChange)

    // 初始化检查全屏状态
    handleFullscreenChange()

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('msfullscreenchange', handleFullscreenChange)
    }
  }, [])
  
  // 同步 ref 和 state
  const updateViewLevel = (level: 'province' | 'city') => {
    viewLevelRef.current = level
    setViewLevel(level)
  }
  
  // 根据选中的城市/县计算数据（县级优先）
  const getAreaStats = (cityName: string | null, countyName: string | null) => {
    const scopedAttractions = attractions.filter((a) => {
      if (cityName && a.city !== cityName) return false
      if (countyName && a.county !== countyName) return false
      return true
    })

    if (!cityName || !cityData[cityName]) {
      return {
        leftStats: defaultLeftStats,
        statusCards: defaultStatusCards,
        barSeries: defaultBarSeries,
        circleStats: defaultCircleStats,
        attractions: scopedAttractions,
      }
    }

    const scoped5A = scopedAttractions.filter((a) => a.level === '5A')
    const scoped4A = scopedAttractions.filter((a) => a.level === '4A')
    const scopedTotal = scoped5A.length + scoped4A.length
    const a5Percent = scopedTotal > 0 ? (scoped5A.length / scopedTotal) * 100 : 0
    const a4Percent = scopedTotal > 0 ? (scoped4A.length / scopedTotal) * 100 : 0

    return {
      leftStats: [
        { label: '5A级景区', value: `${scoped5A.length} 处` },
        { label: '4A级景区', value: `${scoped4A.length} 处` },
        { label: '景区总数', value: `${scopedTotal} 处` },
      ],
      statusCards: [
        { title: '5A级景区', value: scoped5A.length, deltaMoM: '+8.33%', deltaQoQ: '+8.33%', color: '#22d3ee' },
        { title: '4A级景区', value: scoped4A.length, deltaMoM: '+5.20%', deltaQoQ: '+5.20%', color: '#a855f7' },
        { title: '总景区数', value: scopedTotal, deltaMoM: '+5.45%', deltaQoQ: '+5.45%', color: '#22c55e' },
      ],
      // 保持柱状图展示市内县区分布，便于对比
      barSeries: buildCountySeries(cityName),
      circleStats: [
        { label: '5A景区占比', value: a5Percent, color: '#38bdf8' },
        { label: '4A景区占比', value: a4Percent, color: '#a855f7' },
      ],
      attractions: scopedAttractions,
    }
  }
  
  const cityStats = getAreaStats(selectedCity, selectedCounty)
  
  // 确保标题和图例始终可见
  useEffect(() => {
    const ensureVisible = () => {
      if (titleRef.current) {
        titleRef.current.style.opacity = '1'
        titleRef.current.style.display = 'block'
        titleRef.current.style.visibility = 'visible'
        titleRef.current.style.animation = 'none'
        titleRef.current.style.transform = 'none'
      }
      if (legendRef.current) {
        legendRef.current.style.opacity = '1'
        legendRef.current.style.display = 'flex'
        legendRef.current.style.visibility = 'visible'
        legendRef.current.style.animation = 'none'
        legendRef.current.style.transform = 'none'
      }
    }
    
    ensureVisible()
    const interval = setInterval(ensureVisible, 100)
    return () => clearInterval(interval)
  }, [selectedCity, selectedCounty])

  // 按筛选条件过滤景点
  const filteredAttractions = cityStats.attractions.filter((a) => {
    if (attractionFilter === 'all') return true
    if (attractionFilter === '5A' || attractionFilter === '4A') {
      return a.level === attractionFilter
    }
    if (attractionFilter === '山脉' || attractionFilter === '河流') {
      return a.type === attractionFilter
    }
    return true
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    
    // 初始化对象数组（需要在创建粒子前定义）
    const geometries: THREE.BufferGeometry[] = []
    const materials: THREE.Material[] = []
    const objects: THREE.Object3D[] = []
    
    // 创建高级背景：网格纹理 + 渐变
    const createGridTexture = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 512
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      
      ctx.fillStyle = '#0a1020'
      ctx.fillRect(0, 0, 512, 512)
      
      // 绘制网格线
      ctx.strokeStyle = 'rgba(124, 240, 255, 0.15)'
      ctx.lineWidth = 1
      const gridSize = 32
      for (let i = 0; i < 512; i += gridSize) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, 512)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, i)
        ctx.lineTo(512, i)
        ctx.stroke()
      }
      
      // 中心光晕
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
      gradient.addColorStop(0, 'rgba(124, 240, 255, 0.08)')
      gradient.addColorStop(0.5, 'rgba(46, 204, 255, 0.04)')
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 512, 512)
      
      return new THREE.CanvasTexture(canvas)
    }
    
    const gridTexture = createGridTexture()
    if (gridTexture) {
      gridTexture.wrapS = THREE.RepeatWrapping
      gridTexture.wrapT = THREE.RepeatWrapping
      gridTexture.repeat.set(4, 4)
      scene.background = gridTexture
    } else {
      scene.background = new THREE.Color(0x0a1020)
    }
    
    // 添加环境光晕粒子
    const particleGeometry = new THREE.BufferGeometry()
    const particleCount = 200
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const color = new THREE.Color()
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * 2000
      positions[i3 + 1] = (Math.random() - 0.5) * 2000
      positions[i3 + 2] = (Math.random() - 0.5) * 2000
      
      const hue = 0.5 + Math.random() * 0.1 // 蓝色系
      color.setHSL(hue, 0.8, 0.6)
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    })
    
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)
    objects.push(particles)
    geometries.push(particleGeometry)
    materials.push(particleMaterial)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      5000,
    )
    camera.position.set(0, -260, 220)
    camera.up.set(0, 0, 1)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    // 移动端触摸优化
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    }
    controls.enablePan = true
    controls.enableZoom = true
    controls.enableRotate = true

    const ambient = new THREE.AmbientLight(0xffffff, 0.7)
    const directional = new THREE.DirectionalLight(0xffffff, 0.55)
    directional.position.set(320, 320, 420)
    scene.add(ambient, directional)

    const clickables: THREE.Mesh[] = []
    const cityMeshes: THREE.Mesh[] = [] // 省级地图的mesh
    const countyMeshes: THREE.Mesh[] = [] // 县级地图的mesh
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let selectedMeshes = new Set<THREE.Mesh>()
    const labelSprites = new Map<THREE.Mesh, THREE.Sprite>()
    const attractionMarkers: THREE.Sprite[] = [] // 景点标记
    const attractionCurves: THREE.Line[] = [] // 景点曲线
    const attractionLabels: THREE.Sprite[] = [] // 景点名称标签
    let isAnimating = false
    const meshAnimations = new Map<THREE.Mesh, { startTime: number; startZ: number; targetZ: number }>() // 地图块动画
    const labelAnimations = new Map<THREE.Sprite, { startTime: number; startScale: number; targetScale: number }>() // 标签动画

    const createLabel = (text: string, z: number, isHighlighted = false) => {
      const canvas = document.createElement('canvas')
      canvas.width = isHighlighted ? 600 : 360
      canvas.height = isHighlighted ? 300 : 180
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = isHighlighted ? 'rgba(15,23,42,0.9)' : 'rgba(15,23,42,0.7)'
      ctx.strokeStyle = isHighlighted ? 'rgba(125,211,252,0.9)' : 'rgba(125,211,252,0.6)'
      ctx.lineWidth = isHighlighted ? 6 : 3
      const rectW = isHighlighted ? 500 : 300
      const rectH = isHighlighted ? 140 : 84
      const x = (canvas.width - rectW) / 2
      const y = (canvas.height - rectH) / 2
      ctx.roundRect(x, y, rectW, rectH, 12)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#e2e8f0'
      ctx.font = isHighlighted ? 'bold 54px "Inter", sans-serif' : 'bold 32px "Inter", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, canvas.width / 2, canvas.height / 2)

      const texture = new THREE.CanvasTexture(canvas)
      texture.needsUpdate = true
      const material = new THREE.SpriteMaterial({ map: texture, depthTest: false })
      const sprite = new THREE.Sprite(material)
      sprite.scale.set(isHighlighted ? 52 : 30, isHighlighted ? 26 : 15, 1)
      sprite.position.z = z + (isHighlighted ? 40 : 20)
      return sprite
    }

    const placeLabel = (mesh: THREE.Mesh, text: string, position: THREE.Vector3, isHighlighted = false) => {
      const existed = labelSprites.get(mesh)
      if (existed) {
        scene.remove(existed)
        existed.material.dispose()
        ;(existed.material as THREE.SpriteMaterial).map?.dispose()
        labelSprites.delete(mesh)
        labelAnimations.delete(existed)
      }
      const sprite = createLabel(text, position.z, isHighlighted)
      if (sprite) {
        const targetScale = isHighlighted ? 52 : 30
        sprite.scale.set(0, 0, 1) // 初始缩放为0
        const mat = sprite.material as THREE.SpriteMaterial
        mat.opacity = 0 // 初始透明度为0
        sprite.position.set(position.x, position.y, position.z + (isHighlighted ? 40 : 20))
        // 在 sprite 上存储对应的 mesh 引用，方便点击时查找
        sprite.userData.mesh = mesh
        scene.add(sprite)
        labelSprites.set(mesh, sprite)
        // 添加到标签动画列表
        labelAnimations.set(sprite, {
          startTime: Date.now(),
          startScale: 0,
          targetScale,
        })
      }
    }

    // 创建景点标记（偏移位置避免遮挡区县名称）
    const createAttractionMarker = (attractionName: string, position: THREE.Vector3, offsetX: number, offsetY: number) => {
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 200
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      // 绘制圆形背景
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const radius = 60

      // 外圈发光效果
      const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius)
      gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)')
      gradient.addColorStop(0.5, 'rgba(255, 193, 7, 0.6)')
      gradient.addColorStop(1, 'rgba(255, 193, 7, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fill()

      // 主圆形
      ctx.fillStyle = '#FFD700'
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2)
      ctx.fill()

      // 边框
      ctx.strokeStyle = '#FFA500'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2)
      ctx.stroke()

      // 星星图标（简化版）
      ctx.fillStyle = '#FFFFFF'
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
        const x = Math.cos(angle) * 25
        const y = Math.sin(angle) * 25
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.restore()

      const texture = new THREE.CanvasTexture(canvas)
      texture.needsUpdate = true
      const material = new THREE.SpriteMaterial({ 
        map: texture, 
        depthTest: false,
        transparent: true,
        opacity: 0.95,
      })
      const sprite = new THREE.Sprite(material)
      sprite.scale.set(12, 12, 1)
      // 偏移位置，避免遮挡区县名称（区县名称在z+20-40的位置）
      sprite.position.set(position.x + offsetX, position.y + offsetY, position.z + 15)
      sprite.userData = { 
        attractionName,
        baseScale: 12,
        animationStartTime: Date.now(),
      }
      return sprite
    }

    // 创建景点名称标签
    const createAttractionLabel = (text: string, position: THREE.Vector3) => {
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 120
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // 绘制背景
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)'
      ctx.lineWidth = 3
      const padding = 10
      const rectW = canvas.width - padding * 2
      const rectH = canvas.height - padding * 2
      ctx.roundRect(padding, padding, rectW, rectH, 8)
      ctx.fill()
      ctx.stroke()

      // 绘制文字
      ctx.fillStyle = '#FFD700'
      ctx.font = 'bold 28px "Inter", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, canvas.width / 2, canvas.height / 2)

      const texture = new THREE.CanvasTexture(canvas)
      texture.needsUpdate = true
      const material = new THREE.SpriteMaterial({ 
        map: texture, 
        depthTest: false,
        transparent: true,
        opacity: 0,
      })
      const sprite = new THREE.Sprite(material)
      sprite.scale.set(0, 0, 1) // 初始缩放为0
      sprite.position.set(position.x, position.y, position.z)
      sprite.userData = {
        animationStartTime: Date.now(),
        targetScale: 35,
        targetOpacity: 0.95,
      }
      // 添加到标签动画列表
      labelAnimations.set(sprite, {
        startTime: Date.now(),
        startScale: 0,
        targetScale: 35,
      })
      return sprite
    }

    // 在区县位置标记景点
    const markAttractions = (cityName: string, countyMeshes: THREE.Mesh[]) => {
      // 清除之前的景点标记、曲线和标签
      attractionMarkers.forEach((marker) => {
        scene.remove(marker)
        marker.material.dispose()
        ;(marker.material as THREE.SpriteMaterial).map?.dispose()
      })
      attractionMarkers.length = 0

      attractionCurves.forEach((curve) => {
        scene.remove(curve)
        curve.geometry.dispose()
        ;(curve.material as THREE.LineDashedMaterial).dispose()
      })
      attractionCurves.length = 0

      attractionLabels.forEach((label) => {
        scene.remove(label)
        label.material.dispose()
        ;(label.material as THREE.SpriteMaterial).map?.dispose()
      })
      attractionLabels.length = 0

      // 找到该城市的所有景点
      const cityAttractions = attractions.filter(a => a.city === cityName)
      if (cityAttractions.length === 0) return

      // 收集所有区县标签的位置，用于寻找空白区域
      const occupiedPositions: THREE.Vector3[] = []
      countyMeshes.forEach((mesh) => {
        const label = labelSprites.get(mesh)
        if (label) {
          occupiedPositions.push(label.position.clone())
        }
        const centroid = mesh.userData.centroid as THREE.Vector3 | undefined
        if (centroid) {
          // 也记录区县质心位置（区县名称标签在质心上方）
          occupiedPositions.push(new THREE.Vector3(centroid.x, centroid.y, centroid.z + 20))
        }
      })

      // 计算县级地图的边界（包括所有mesh的实际边界）
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      countyMeshes.forEach((mesh) => {
        const centroid = mesh.userData.centroid as THREE.Vector3 | undefined
        if (centroid) {
          minX = Math.min(minX, centroid.x)
          maxX = Math.max(maxX, centroid.x)
          minY = Math.min(minY, centroid.y)
          maxY = Math.max(maxY, centroid.y)
        }
        // 也考虑mesh的实际边界
        mesh.geometry.computeBoundingBox()
        const box = mesh.geometry.boundingBox
        if (box) {
          minX = Math.min(minX, box.min.x)
          maxX = Math.max(maxX, box.max.x)
          minY = Math.min(minY, box.min.y)
          maxY = Math.max(maxY, box.max.y)
        }
      })

      // 扩展边界，确保标签在板块外
      const padding = 20
      const boundaryMinX = minX - padding
      const boundaryMaxX = maxX + padding
      const boundaryMinY = minY - padding
      const boundaryMaxY = maxY + padding

      // 寻找板块外最近的空白位置
      const findNearestEmptySpace = (startPos: THREE.Vector3): THREE.Vector3 => {
        const searchRadius = 100
        const searchStep = 15
        let bestPos: THREE.Vector3 | null = null
        let minDistance = Infinity

        // 在8个方向搜索
        const directions = [
          [1, 0], [0, 1], [-1, 0], [0, -1],
          [1, 1], [-1, 1], [-1, -1], [1, -1]
        ]

        for (let radius = searchStep; radius <= searchRadius; radius += searchStep) {
          for (const [dx, dy] of directions) {
            const testX = startPos.x + dx * radius
            const testY = startPos.y + dy * radius
            const testZ = startPos.z + 30
            const testPos = new THREE.Vector3(testX, testY, testZ)

            // 检查是否在板块外（边界外）
            const isOutsideBoundary = 
              testX < boundaryMinX || testX > boundaryMaxX ||
              testY < boundaryMinY || testY > boundaryMaxY

            if (!isOutsideBoundary) continue // 跳过板块内的位置

            // 检查是否与已有位置冲突（保持一定距离）
            const minDistanceToOccupied = Math.min(
              ...occupiedPositions.map(pos => testPos.distanceTo(pos))
            )

            if (minDistanceToOccupied > 30) { // 至少30单位距离
              const distance = startPos.distanceTo(testPos)
              if (distance < minDistance) {
                minDistance = distance
                bestPos = testPos
              }
            }
          }
          if (bestPos) break // 找到第一个合适的就停止
        }

        // 如果没找到，使用默认位置（右侧板块外）
        if (!bestPos) {
          bestPos = new THREE.Vector3(boundaryMaxX + 30, startPos.y, startPos.z + 30)
        }

        return bestPos
      }

      // 为每个景点找到对应的区县mesh并创建标记
      cityAttractions.forEach((attraction) => {
        // 查找对应的区县mesh
        const countyMesh = countyMeshes.find((mesh) => {
          const name = mesh.userData.name as string | undefined
          if (!name) return false
          // 匹配区县名称（支持多种格式）
          return name === attraction.county || 
                 name.includes(attraction.county.replace('县', '').replace('区', '')) ||
                 attraction.county.includes(name.replace('县', '').replace('区', ''))
        })

        if (countyMesh) {
          const centroid = countyMesh.userData.centroid as THREE.Vector3 | undefined
          if (centroid) {
            // 计算星星偏移位置（避免遮挡区县名称，区县名称在z+20-40）
            // 偏移到质心的右下方
            const markerOffsetX = 8
            const markerOffsetY = -8
            const markerPos = new THREE.Vector3(
              centroid.x + markerOffsetX,
              centroid.y + markerOffsetY,
              centroid.z + 15
            )

            // 创建景点标记
            const marker = createAttractionMarker(attraction.name, centroid, markerOffsetX, markerOffsetY)
            if (marker) {
              scene.add(marker)
              attractionMarkers.push(marker)
            }

            // 找到最近的空白位置
            const labelPos = findNearestEmptySpace(markerPos)
            occupiedPositions.push(labelPos) // 记录已使用的位置

            // 创建虚线曲线（从景点标记位置到标签位置）
            const startPoint = markerPos.clone()
            const controlPoint = new THREE.Vector3(
              (startPoint.x + labelPos.x) / 2,
              (startPoint.y + labelPos.y) / 2,
              Math.max(startPoint.z, labelPos.z) + 15 // 曲线高点
            )
            const endPoint = labelPos

            // 使用二次贝塞尔曲线
            const curve = new THREE.QuadraticBezierCurve3(startPoint, controlPoint, endPoint)
            const points = curve.getPoints(50)
            const geometry = new THREE.BufferGeometry().setFromPoints(points)
            
            // 使用虚线材质（更粗的虚线）
            const material = new THREE.LineDashedMaterial({
              color: 0xFFD700,
              linewidth: 4,
              transparent: true,
              opacity: 0.8,
              dashSize: 5,
              gapSize: 3,
            })
            const line = new THREE.Line(geometry, material)
            line.computeLineDistances() // 必须调用这个才能显示虚线
            scene.add(line)
            attractionCurves.push(line)

            // 创建景点名称标签
            const label = createAttractionLabel(attraction.name, labelPos)
            if (label) {
              scene.add(label)
              attractionLabels.push(label)
            }

            console.log(`标记景点: ${attraction.name} 在 ${attraction.county}`)
          }
        } else {
          console.warn(`未找到区县 ${attraction.county} 的mesh，无法标记景点 ${attraction.name}`)
        }
      })
    }

    const restoreMesh = (mesh: THREE.Mesh) => {
      const data = mesh.userData as {
        baseZ?: number
        baseColor?: number
        baseEdgeColor?: number
      }
      mesh.position.z = data.baseZ ?? -3
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (data.baseColor) mat.color.set(data.baseColor)
      const edge = mesh.getObjectByName('edge') as THREE.LineSegments
      if (edge) {
        const edgeMat = edge.material as THREE.LineBasicMaterial
        if (data.baseEdgeColor) edgeMat.color.set(data.baseEdgeColor)
      }
    }

    const resetAllHighlights = () => {
      selectedMeshes.forEach((mesh) => restoreMesh(mesh))
      selectedMeshes.clear()
      labelSprites.forEach((sprite) => {
        scene.remove(sprite)
        sprite.material.dispose()
        ;(sprite.material as THREE.SpriteMaterial).map?.dispose()
      })
      labelSprites.clear()
      setStatus('点击区域以选中县级行政区')
    }

    // 判断是否为市级（名称以"市"结尾且不是县级）
    const isCityLevel = (name: string | undefined): boolean => {
      if (!name) return false
      // 检查是否是市级（以"市"结尾，且不是"县"、"区"等）
      // 市级名称：承德市、秦皇岛市、唐山市等
      const cityNames = ['承德', '秦皇岛', '唐山', '保定', '石家庄', '邯郸', '邢台', '张家口', '沧州', '衡水', '廊坊']
      const cityName = cityNames.find(c => name.includes(c))
      return !!cityName && name.endsWith('市') && !name.includes('县') && !name.includes('区')
    }

    // 相机动画到目标位置
    const animateCamera = (
      targetPosition: THREE.Vector3,
      targetLookAt: THREE.Vector3,
      duration = 1500,
    ) => {
      if (isAnimating) return
      isAnimating = true
      const startPosition = camera.position.clone()
      const startLookAt = new THREE.Vector3()
      camera.getWorldDirection(startLookAt)
      startLookAt.multiplyScalar(100).add(camera.position)

      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easeProgress = 1 - Math.pow(1 - progress, 3) // 缓动函数

        camera.position.lerpVectors(startPosition, targetPosition, easeProgress)
        
        const currentLookAt = new THREE.Vector3()
        currentLookAt.lerpVectors(startLookAt, targetLookAt, easeProgress)
        controls.target.lerpVectors(controls.target, targetLookAt, easeProgress)
        controls.update()

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          isAnimating = false
        }
      }
      animate()
    }

    // 加载县级数据
    const loadCountyData = async (cityName: string) => {
      try {
        setStatus(`正在加载${cityName}县级数据…`)
        // 尝试不同的文件路径
        let response: Response | null = null
        const filePaths = [
          '/河北省 (2).geojson',
          '/河北省%20(2).geojson',
          '/河北省%20%282%29.geojson',
          '/河北省 (1).geojson',
          '/河北省%20(1).geojson',
          '/河北省%20%281%29.geojson',
        ]
        
        for (const path of filePaths) {
          try {
            response = await fetch(path)
            if (response.ok) break
          } catch (e) {
            console.warn(`尝试路径 ${path} 失败:`, e)
          }
        }
        
        if (!response || !response.ok) {
          throw new Error(`无法加载县级数据文件，请确保文件存在`)
        }
        
        const data: FeatureCollection | Feature = await response.json()
        const features =
          data.type === 'FeatureCollection' ? data.features : [data]

        console.log(`加载了 ${features.length} 个特征，查找 ${cityName} 的县级数据`)

        // 获取市级区域的边界框（在原始地理坐标系中）
        // 需要从省级地图的投影中获取市级区域的原始坐标
        // 由于我们已经有了cityMesh，我们需要找到对应的原始GeoJSON特征
        // 但更简单的方法是：根据市级区域的几何边界来匹配县级区域
        
        // 方法：根据市级区域的质心和边界，在县级数据中找到所有质心在市级边界内的县级区域
        // 由于坐标系统不同，我们需要使用地理坐标进行匹配
        
        // 首先，我们需要获取市级区域的原始地理坐标
        // 从省级GeoJSON中找到对应的市级特征
        const cityGeoJsonResponse = await fetch('/河北省.geojson')
        if (!cityGeoJsonResponse.ok) {
          throw new Error('无法加载省级地图数据')
        }
        const cityGeoJson: FeatureCollection | Feature = await cityGeoJsonResponse.json()
        const cityFeatures = cityGeoJson.type === 'FeatureCollection' ? cityGeoJson.features : [cityGeoJson]
        
        // 找到对应的市级特征
        const cityFeature = cityFeatures.find((f) => {
          const name = f.properties?.name as string | undefined
          return name && name.includes(cityName)
        })
        
        if (!cityFeature) {
          throw new Error(`未找到${cityName}的省级数据`)
        }
        
        // 获取市级区域的边界框（地理坐标）
        const cityPoints: Position[] = []
        const collectCityPoints = (rings: PolygonRings) => {
          rings.forEach((ring) => {
            ring.forEach((pt) => {
              if (Array.isArray(pt) && pt.length >= 2) {
                cityPoints.push([pt[0], pt[1]])
              }
            })
          })
        }
        
        if (cityFeature.geometry.type === 'Polygon') {
          collectCityPoints(cityFeature.geometry.coordinates)
        } else if (cityFeature.geometry.type === 'MultiPolygon') {
          cityFeature.geometry.coordinates.forEach((poly) => collectCityPoints(poly))
        }
        
        const cityLons = cityPoints.map((p) => p[0])
        const cityLats = cityPoints.map((p) => p[1])
        const cityLonMin = Math.min(...cityLons)
        const cityLonMax = Math.max(...cityLons)
        const cityLatMin = Math.min(...cityLats)
        const cityLatMax = Math.max(...cityLats)
        
        console.log(`${cityName}边界框:`, {
          lon: [cityLonMin, cityLonMax],
          lat: [cityLatMin, cityLatMax],
        })
        
        // 点在多边形内的判断函数（射线法）
        const pointInPolygon = (point: Position, polygon: Position[]): boolean => {
          let inside = false
          for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1]
            const xj = polygon[j][0], yj = polygon[j][1]
            const intersect = ((yi > point[1]) !== (yj > point[1])) &&
              (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi)
            if (intersect) inside = !inside
          }
          return inside
        }
        
        // 检查点是否在多边形内（支持MultiPolygon）
        const pointInCityPolygon = (point: Position): boolean => {
          if (cityFeature.geometry.type === 'Polygon') {
            // 检查外环（第一个环）
            const outerRing = cityFeature.geometry.coordinates[0]
            if (pointInPolygon(point, outerRing)) {
              // 检查是否在内环（洞）中
              for (let i = 1; i < cityFeature.geometry.coordinates.length; i++) {
                if (pointInPolygon(point, cityFeature.geometry.coordinates[i])) {
                  return false // 在内环中，说明不在多边形内
                }
              }
              return true
            }
          } else if (cityFeature.geometry.type === 'MultiPolygon') {
            // 检查是否在任何一个多边形内
            for (const poly of cityFeature.geometry.coordinates) {
              const outerRing = poly[0]
              if (pointInPolygon(point, outerRing)) {
                // 检查是否在内环中
                let inHole = false
                for (let i = 1; i < poly.length; i++) {
                  if (pointInPolygon(point, poly[i])) {
                    inHole = true
                    break
                  }
                }
                if (!inHole) return true
              }
            }
          }
          return false
        }
        
        // 在县级数据中找到所有属于该市的县级区域
        const countyFeatures = features.filter((feature) => {
          const name = feature.properties?.name as string | undefined
          if (!name) return false
          
          // 排除市级本身
          if (name.endsWith('市') && !name.includes('县') && !name.includes('区')) {
            return false
          }
          
          // 计算县级区域的质心（地理坐标）
          let countyPoints: Position[] = []
          const collectCountyPoints = (rings: PolygonRings) => {
            rings.forEach((ring) => {
              ring.forEach((pt) => {
                if (Array.isArray(pt) && pt.length >= 2) {
                  countyPoints.push([pt[0], pt[1]])
                }
              })
            })
          }
          
          if (feature.geometry.type === 'Polygon') {
            collectCountyPoints(feature.geometry.coordinates)
          } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach((poly) => collectCountyPoints(poly))
          }
          
          if (countyPoints.length === 0) return false
          
          // 计算质心
          const centroidLon = countyPoints.reduce((sum, p) => sum + p[0], 0) / countyPoints.length
          const centroidLat = countyPoints.reduce((sum, p) => sum + p[1], 0) / countyPoints.length
          const centroid: Position = [centroidLon, centroidLat]
          
          // 方法1：先检查是否在边界框内（快速筛选）
          const tolerance = 0.15 // 增加容差到约16.5公里
          const inBoundingBox = 
            centroidLon >= cityLonMin - tolerance &&
            centroidLon <= cityLonMax + tolerance &&
            centroidLat >= cityLatMin - tolerance &&
            centroidLat <= cityLatMax + tolerance
          
          if (!inBoundingBox) return false
          
          // 方法2：精确检查是否在市级多边形内
          const inPolygon = pointInCityPolygon(centroid)
          
          // 如果质心不在多边形内，但很接近边界框，也尝试检查县级区域的多个点
          if (!inPolygon) {
            // 检查县级区域的几个关键点是否在市级多边形内
            let pointsInPolygon = 0
            const samplePoints = countyPoints.filter((_, i) => i % Math.max(1, Math.floor(countyPoints.length / 10)) === 0)
            samplePoints.slice(0, 10).forEach((pt) => {
              if (pointInCityPolygon(pt)) {
                pointsInPolygon++
              }
            })
            // 如果有超过20%的点在多边形内，认为属于该市
            if (pointsInPolygon / samplePoints.length > 0.2) {
              console.log(`匹配到县级（部分点匹配）: ${name} (${pointsInPolygon}/${samplePoints.length} 点在多边形内)`)
              return true
            }
          }
          
          if (inPolygon) {
            console.log(`匹配到县级: ${name} (质心: ${centroidLon.toFixed(4)}, ${centroidLat.toFixed(4)})`)
          }
          
          return inPolygon
        })
        
        console.log(`找到 ${countyFeatures.length} 个县级区域`)

        if (countyFeatures.length === 0) {
          console.error(`未找到 ${cityName} 的县级数据`)
          console.log('所有特征名称:', features.map(f => f.properties?.name).filter(Boolean))
          setStatus(`${cityName}暂无县级数据，请检查数据文件`)
          // 即使没有县级数据，也要高亮显示市级
          return
        }

        // 进入县级视图（先更新视图级别，确保后续创建的县级 mesh 会被加入 clickables）
        updateViewLevel('city')

        // 隐藏省级地图及其标签
        cityMeshes.forEach((mesh) => {
          mesh.visible = false
          // 隐藏对应的标签
          const label = labelSprites.get(mesh)
          if (label) {
            label.visible = false
          }
        })

        // 清除之前的县级地图及其标签
        countyMeshes.forEach((mesh) => {
          scene.remove(mesh)
          const edge = mesh.getObjectByName('edge')
          if (edge) scene.remove(edge)
          // 清除对应的标签
          const label = labelSprites.get(mesh)
          if (label) {
            scene.remove(label)
            label.material.dispose()
            ;(label.material as THREE.SpriteMaterial).map?.dispose()
            labelSprites.delete(mesh)
          }
        })
        countyMeshes.length = 0

        // 先更新视图级别为city，这样addPolygon会将县级mesh添加到clickables
        // 注意：必须在加载县级数据之前更新视图级别
        updateViewLevel('city')
        
        // 清空 clickables，确保只包含县级 mesh
        clickables.length = 0

        // 加载县级地图
        const points = collectPoints(countyFeatures)
        if (points.length === 0) {
          setStatus(`${cityName}县级数据为空`)
          return
        }

        const project = buildProjector(points)

        countyFeatures.forEach((feature) => {
          if (feature.geometry.type === 'Polygon') {
            addPolygon(feature.geometry.coordinates, project, feature.properties, true)
          } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach((poly) =>
              addPolygon(poly, project, feature.properties, true),
            )
          }
        })

        // 标记景点
        markAttractions(cityName, countyMeshes)

        // 计算县级地图的边界
        const countyPoints = collectPoints(countyFeatures)
        const countyProject = buildProjector(countyPoints)
        const bounds = {
          minX: Infinity,
          maxX: -Infinity,
          minY: Infinity,
          maxY: -Infinity,
        }

        countyFeatures.forEach((feature) => {
          const processRing = (ring: Ring) => {
            ring.forEach((pt) => {
              const v = countyProject(pt)
              bounds.minX = Math.min(bounds.minX, v.x)
              bounds.maxX = Math.max(bounds.maxX, v.x)
              bounds.minY = Math.min(bounds.minY, v.y)
              bounds.maxY = Math.max(bounds.maxY, v.y)
            })
          }

          if (feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates.forEach(processRing)
          } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach((poly) => poly.forEach(processRing))
          }
        })

        const centerX = (bounds.minX + bounds.maxX) / 2
        const centerY = (bounds.minY + bounds.maxY) / 2
        const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)
        const distance = Math.max(span * 1.8, 80) // 确保有足够的距离

        console.log('县级地图边界:', bounds, '中心:', centerX, centerY, '距离:', distance)

        // 相机动画到县级视图 - 使用更合适的视角
        const targetPos = new THREE.Vector3(centerX, centerY - distance * 0.7, distance * 0.7)
        const targetLookAt = new THREE.Vector3(centerX, centerY, 0)
        console.log('相机目标位置:', targetPos, '目标焦点:', targetLookAt)
        animateCamera(targetPos, targetLookAt)

        setStatus(`已加载${cityName}县级数据，共${countyFeatures.length}个区县`)
      } catch (err) {
        console.error('加载县级数据错误:', err)
        const errorMsg = err instanceof Error ? err.message : '加载县级数据失败'
        setError(errorMsg)
        setStatus(`加载失败: ${errorMsg}`)
        // 即使加载失败，也保持市级高亮
      }
    }

    // 返回省级视图
    const returnToProvince = () => {
      // 清空 clickables，准备重新添加市级 mesh
      clickables.length = 0
      
      // 更新视图级别为省级
      updateViewLevel('province')
      
      // 显示省级地图，并重新添加到 clickables（只添加市级）
      cityMeshes.forEach((mesh) => {
        mesh.visible = true
        // 只添加市级 mesh 到 clickables
        const name = mesh.userData.name as string | undefined
        if (isCityLevel(name)) {
          clickables.push(mesh)
        }
      })

      // 清除县级地图及其标签，并从clickables中移除
      countyMeshes.forEach((mesh) => {
        scene.remove(mesh)
        const edge = mesh.getObjectByName('edge')
        if (edge) scene.remove(edge)
        // 清除对应的标签
        const label = labelSprites.get(mesh)
        if (label) {
          scene.remove(label)
          label.material.dispose()
          ;(label.material as THREE.SpriteMaterial).map?.dispose()
          labelSprites.delete(mesh)
        }
        // 从clickables中移除
        const index = clickables.indexOf(mesh)
        if (index > -1) {
          clickables.splice(index, 1)
        }
      })
      countyMeshes.length = 0

      // 清除景点标记、曲线和标签
      attractionMarkers.forEach((marker) => {
        scene.remove(marker)
        marker.material.dispose()
        ;(marker.material as THREE.SpriteMaterial).map?.dispose()
      })
      attractionMarkers.length = 0

      attractionCurves.forEach((curve) => {
        scene.remove(curve)
        curve.geometry.dispose()
        ;(curve.material as THREE.LineDashedMaterial).dispose()
      })
      attractionCurves.length = 0

      attractionLabels.forEach((label) => {
        scene.remove(label)
        label.material.dispose()
        ;(label.material as THREE.SpriteMaterial).map?.dispose()
      })
      attractionLabels.length = 0

      // 重置高亮状态
      resetAllHighlights()

      // 重新为所有市级区域创建标签
      cityMeshes.forEach((mesh) => {
        const name = mesh.userData.name as string | undefined
        const centroid = mesh.userData.centroid as THREE.Vector3 | undefined
        if (name && centroid) {
          // 检查是否被选中
          const isHighlighted = selectedMeshes.has(mesh)
          placeLabel(mesh, name, centroid, isHighlighted)
        }
      })

      // 重置相机
      const targetPos = new THREE.Vector3(0, -260, 220)
      const targetLookAt = new THREE.Vector3(0, 0, 0)
      animateCamera(targetPos, targetLookAt)

      setSelectedCity(null)
      setSelectedCounty(null)
      setStatus('已返回省级视图')
    }
    
    // 将函数存储到 ref 中
    returnToProvinceRef.current = returnToProvince

    const applyHighlight = (mesh: THREE.Mesh) => {
      if (isAnimating) return

      const name = mesh.userData.name as string | undefined
      const centroid = mesh.userData.centroid as THREE.Vector3 | undefined

      // 县级视图：允许点击县/区进行高亮，但不允许点击市级
      if (viewLevelRef.current === 'city') {
        // 确保只有县级 mesh 可以被点击
        if (!countyMeshes.includes(mesh)) {
          console.log('县级视图：阻止点击非县级区域', name)
          return
        }

        // 仅对当前县级mesh进行高亮，先移除其他县级高亮
        selectedMeshes.forEach((prevMesh) => {
          if (countyMeshes.includes(prevMesh)) {
            restoreMesh(prevMesh)
            const prevName = prevMesh.userData.name as string | undefined
            const prevCentroid = prevMesh.userData.centroid as THREE.Vector3 | undefined
            if (prevName && prevCentroid) {
              placeLabel(prevMesh, prevName, prevCentroid, false)
            }
            selectedMeshes.delete(prevMesh)
          }
        })

        // 切换当前县级选中
        if (selectedMeshes.has(mesh)) {
          restoreMesh(mesh)
          if (name && centroid) {
            placeLabel(mesh, name, centroid, false)
          }
          selectedMeshes.delete(mesh)
          setSelectedCounty(null)
          setStatus('已取消县级选中')
          return
        }

        // 添加脉冲动画
        const baseZ = mesh.userData.baseZ ?? -3
        const targetZ = baseZ + 15
        
        let pulseCount = 0
        const pulseDuration = 300
        const pulseAnimation = () => {
          pulseCount++
          const progress = (pulseCount * 16) / pulseDuration
          if (progress < 1) {
            const pulse = Math.sin(progress * Math.PI) * 3
            mesh.position.z = targetZ + pulse
            requestAnimationFrame(pulseAnimation)
          } else {
            mesh.position.z = targetZ
          }
        }
        pulseAnimation()

        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.color.set(0xf59e0b)
        const edge = mesh.getObjectByName('edge') as THREE.LineSegments
        if (edge) {
          const edgeMat = edge.material as THREE.LineBasicMaterial
          edgeMat.color.set(0xfbbf24)
        }
        selectedMeshes.add(mesh)

        if (name && centroid) {
          placeLabel(mesh, name, centroid, true)
          setSelectedCounty(name)
          setStatus(`已选中：${name}`)
          
          // 移动相机到选中的县级位置
          const cameraDistance = 60
          const cameraHeight = 50
          const cameraOffsetX = 20
          
          const targetLookAt = centroid.clone()
          const targetPosition = new THREE.Vector3(
            centroid.x + cameraOffsetX,
            centroid.y - cameraDistance * 0.6,
            centroid.z + cameraHeight
          )
          
          animateCamera(targetPosition, targetLookAt, 800)
        }
        return
      }

      // 如果点击的是已选中的板块，则取消选中（仅在省级视图时）
      if (selectedMeshes.has(mesh)) {
        restoreMesh(mesh)
        selectedMeshes.delete(mesh)
        if (name && centroid) {
          placeLabel(mesh, name, centroid, false)
        }
        setStatus('点击区域以选中县级行政区')
        setSelectedCity(null)
        
        // 重置相机到默认位置
        const defaultPosition = new THREE.Vector3(0, -260, 220)
        const defaultLookAt = new THREE.Vector3(0, 0, 0)
        animateCamera(defaultPosition, defaultLookAt, 1000)
        return
      }

      // 如果点击新板块，先清除之前选中的所有板块（只能选择一个）
      if (selectedMeshes.size > 0) {
        selectedMeshes.forEach((prevMesh) => {
          restoreMesh(prevMesh)
          const prevName = prevMesh.userData.name as string | undefined
          const prevCentroid = prevMesh.userData.centroid as THREE.Vector3 | undefined
          if (prevName && prevCentroid) {
            placeLabel(prevMesh, prevName, prevCentroid, false)
          }
        })
        selectedMeshes.clear()
        setSelectedCounty(null)
      }

      console.log('点击区域:', name, '当前视图级别:', viewLevelRef.current, '是否为市级:', isCityLevel(name))

      // 判断是否为市级
      if (viewLevelRef.current === 'province' && isCityLevel(name)) {
        console.log('检测到市级点击，准备加载县级数据')
        // 选中市级，加载县级数据
        const cityName = extractCityName(name)
        console.log('提取的城市名:', cityName)
        if (cityName && centroid) {
          // 先高亮显示（无论是否加载成功）- 添加脉冲动画
          const mat = mesh.material as THREE.MeshStandardMaterial
          const baseZ = mesh.userData.baseZ ?? -3
          const targetZ = baseZ + 15
          
          // 脉冲动画
          let pulseCount = 0
          const pulseDuration = 300
          const pulseAnimation = () => {
            pulseCount++
            const progress = (pulseCount * 16) / pulseDuration
            if (progress < 1) {
              const pulse = Math.sin(progress * Math.PI) * 3
              mesh.position.z = targetZ + pulse
              requestAnimationFrame(pulseAnimation)
            } else {
              mesh.position.z = targetZ
            }
          }
          pulseAnimation()
          
          mat.color.set(0xf59e0b)
          const edge = mesh.getObjectByName('edge') as THREE.LineSegments
          if (edge) {
            const edgeMat = edge.material as THREE.LineBasicMaterial
            edgeMat.color.set(0xfbbf24)
          }
          selectedMeshes.add(mesh)
          setSelectedCity(cityName)
          setSelectedCounty(null)
          placeLabel(mesh, name || '', centroid, true)
          console.log('开始加载县级数据:', cityName)
          
          // 异步加载县级数据，不影响高亮显示
          loadCountyData(cityName).catch((err) => {
            console.error('加载县级数据失败:', err)
            setStatus(`${cityName}县级数据加载失败: ${err.message}`)
          })
        } else {
          console.warn('无法提取城市名或缺少质心:', { cityName, centroid })
          setStatus('无法识别城市信息')
        }
        return
      }

      // 选中新板块（县级或省级）- 添加脉冲动画
      const mat = mesh.material as THREE.MeshStandardMaterial
      const baseZ = mesh.userData.baseZ ?? -3
      const targetZ = baseZ + 15
      
      // 脉冲动画
      let pulseCount = 0
      const pulseDuration = 300
      const pulseAnimation = () => {
        pulseCount++
        const progress = (pulseCount * 16) / pulseDuration // 假设60fps，每帧约16ms
        if (progress < 1) {
          const pulse = Math.sin(progress * Math.PI) * 3 // 脉冲高度
          mesh.position.z = targetZ + pulse
          requestAnimationFrame(pulseAnimation)
        } else {
          mesh.position.z = targetZ
        }
      }
      pulseAnimation()
      
      mat.color.set(0xf59e0b)
      const edge = mesh.getObjectByName('edge') as THREE.LineSegments
      if (edge) {
        const edgeMat = edge.material as THREE.LineBasicMaterial
        edgeMat.color.set(0xfbbf24)
      }
      selectedMeshes.add(mesh)

      // 提取城市名并更新选中状态
      const cityName = extractCityName(name)
      if (cityName) {
        setSelectedCity(cityName)
      }

      setStatus(name ? `已选中：${name}` : '已选中一个区域')
      if (name && centroid) {
        placeLabel(mesh, name, centroid, true)
      }

      // 移动相机到点击的板块位置
      if (centroid && viewLevelRef.current === 'province') {
        // 计算相机位置：在质心上方和侧方，保持合适的视角
        const cameraDistance = 120 // 相机距离
        const cameraHeight = 80 // 相机高度
        const cameraOffsetX = 40 // 侧方偏移
        
        const targetLookAt = centroid.clone()
        const targetPosition = new THREE.Vector3(
          centroid.x + cameraOffsetX,
          centroid.y - cameraDistance * 0.6,
          centroid.z + cameraHeight
        )
        
        animateCamera(targetPosition, targetLookAt, 1000)
      }
    }

    const collectPoints = (features: Feature[]) => {
      const points: Position[] = []
      const pushRing = (rings: PolygonRings) => {
        rings.forEach((ring) => {
          ring.forEach((pt) => {
            if (Array.isArray(pt) && pt.length >= 2) {
              points.push([pt[0], pt[1]])
            }
          })
        })
      }

      features.forEach((feature) => {
        if (feature.geometry.type === 'Polygon') {
          pushRing(feature.geometry.coordinates)
        } else if (feature.geometry.type === 'MultiPolygon') {
          feature.geometry.coordinates.forEach((rings) => pushRing(rings))
        }
      })

      return points
    }

    const buildProjector = (points: Position[]): ProjectFn => {
      const lons = points.map((p) => p[0])
      const lats = points.map((p) => p[1])
      const lonMin = Math.min(...lons)
      const lonMax = Math.max(...lons)
      const latMin = Math.min(...lats)
      const latMax = Math.max(...lats)

      const span = Math.max(lonMax - lonMin, latMax - latMin)
      const scale = 240 / (span || 1) // target scene span
      const centerLon = (lonMax + lonMin) / 2
      const centerLat = (latMax + latMin) / 2

      return ([lon, lat]) =>
        new THREE.Vector2((lon - centerLon) * scale, (lat - centerLat) * scale)
    }

    const addPolygon = (
      rings: PolygonRings,
      project: ProjectFn,
      props?: Record<string, unknown>,
      isCounty = false,
    ) => {
      if (!rings.length) return
      const shape = new THREE.Shape()
      const [outer, ...holes] = rings

      const centroid2D = outer.reduce(
        (acc, pt) => {
          const v = project(pt)
          acc.x += v.x
          acc.y += v.y
          return acc
        },
        { x: 0, y: 0 },
      )
      centroid2D.x /= outer.length || 1
      centroid2D.y /= outer.length || 1

      outer.forEach((pt, idx) => {
        const v = project(pt)
        if (idx === 0) shape.moveTo(v.x, v.y)
        else shape.lineTo(v.x, v.y)
      })

      holes.forEach((ring) => {
        const path = new THREE.Path()
        ring.forEach((pt, idx) => {
          const v = project(pt)
          if (idx === 0) path.moveTo(v.x, v.y)
          else path.lineTo(v.x, v.y)
        })
        shape.holes.push(path)
      })

      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 6,
        bevelEnabled: false,
      })

      // 星耀蓝主色与描边
      const baseColor = 0x0e5de8
      const baseEdgeColor = 0x7cf0ff

      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        emissive: 0x29b6f6,
        emissiveIntensity: 0.6,
        opacity: 1,
        transparent: false,
        metalness: 0.2,
        roughness: 0.32,
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.z = -3 // shift so depth extrudes both sides
      
      // 初始状态：透明和缩放
      material.opacity = 0
      material.transparent = true
      mesh.scale.set(0.8, 0.8, 1)
      
      // 添加到动画列表
      const animationDelay = Math.random() * 500 // 随机延迟0-500ms
      meshAnimations.set(mesh, {
        startTime: Date.now() + animationDelay,
        startZ: mesh.position.z,
        targetZ: mesh.position.z,
      })

      const edgeGeometry = new THREE.EdgesGeometry(geometry)
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: baseEdgeColor,
        transparent: true,
        opacity: 0,
      })
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial)
      edges.name = 'edge'
      mesh.add(edges)

      scene.add(mesh)
      geometries.push(geometry, edgeGeometry)
      materials.push(material, edgeMaterial)
      objects.push(mesh, edges)
      
      // 根据是否为县级添加到不同的数组
      if (isCounty) {
        countyMeshes.push(mesh)
        // 县级mesh只在市级视图时加入可点击列表
        // 只有在市级视图（viewLevelRef.current === 'city'）时才添加到 clickables
        if (viewLevelRef.current === 'city') {
          clickables.push(mesh)
        }
      } else {
        cityMeshes.push(mesh)
        // 判断是否为市级，只有市级在省级视图时可点击
        const name = props?.name as string | undefined
        if (isCityLevel(name)) {
          // 只有在省级视图（viewLevelRef.current === 'province'）时才添加到 clickables
          if (viewLevelRef.current === 'province') {
            clickables.push(mesh)
          }
        }
      }
      
      const centroid = new THREE.Vector3(centroid2D.x, centroid2D.y, mesh.position.z)
      mesh.userData = {
        ...props,
        baseZ: mesh.position.z,
        baseColor,
        baseEdgeColor,
        centroid,
      }
      // 为每个区域创建常驻标签
      const name = props?.name as string | undefined
      if (name) {
        placeLabel(mesh, name, centroid, false)
      }
    }

    const loadGeoJson = async () => {
      try {
        setError(null)
        setStatus('正在加载河北省地图…')
        
        // 确保视图级别为省级，这样只有市级 mesh 会被添加到 clickables
        updateViewLevel('province')
        
        // 清空 clickables，准备添加市级 mesh
        clickables.length = 0
        
        const response = await fetch('/河北省.geojson')
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data: FeatureCollection | Feature = await response.json()
        const features =
          data.type === 'FeatureCollection' ? data.features : [data]

        if (!features.length) throw new Error('GeoJSON 中没有 features')

        const points = collectPoints(features)
        if (!points.length) throw new Error('找不到坐标点')

        const project = buildProjector(points)

        features.forEach((feature) => {
          if (feature.geometry.type === 'Polygon') {
            addPolygon(feature.geometry.coordinates, project, feature.properties)
          } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach((poly) =>
              addPolygon(poly, project, feature.properties),
            )
          }
        })

        setStatus('加载完成，可拖拽旋转，滚轮缩放')
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : '未知错误')
        setStatus('加载失败')
      }
    }

    loadGeoJson()

    const handleResize = () => {
      if (!container) return
      const { clientWidth, clientHeight } = container
      renderer.setSize(clientWidth, clientHeight)
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', handleResize)

    let frameId = 0
    const renderLoop = () => {
      controls.update()
      // 旋转粒子系统
      particles.rotation.y += 0.0005
      particles.rotation.x += 0.0003
      
      const currentTime = Date.now()
      
      // 地图块加载动画
      meshAnimations.forEach((anim, mesh) => {
        if (currentTime < anim.startTime) return
        
        const elapsed = currentTime - anim.startTime
        const duration = 800 // 动画持续时间
        const progress = Math.min(elapsed / duration, 1)
        const easeProgress = 1 - Math.pow(1 - progress, 3) // 缓动函数
        
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.opacity = easeProgress
        mat.transparent = easeProgress < 1
        
        const edge = mesh.getObjectByName('edge') as THREE.LineSegments
        if (edge) {
          const edgeMat = edge.material as THREE.LineBasicMaterial
          edgeMat.opacity = easeProgress
        }
        
        // 缩放动画
        const scale = 0.8 + (1 - 0.8) * easeProgress
        mesh.scale.set(scale, scale, 1)
        
        if (progress >= 1) {
          meshAnimations.delete(mesh)
          mat.transparent = false
          if (edge) {
            const edgeMat = edge.material as THREE.LineBasicMaterial
            edgeMat.transparent = false
          }
        }
      })
      
      // 标签出现动画
      labelAnimations.forEach((anim, sprite) => {
        const elapsed = currentTime - anim.startTime
        const duration = 600
        const progress = Math.min(elapsed / duration, 1)
        const easeProgress = 1 - Math.pow(1 - progress, 2) // 缓动函数
        
        const scale = anim.startScale + (anim.targetScale - anim.startScale) * easeProgress
        sprite.scale.set(scale, scale * 0.5, 1)
        
        const mat = sprite.material as THREE.SpriteMaterial
        if (sprite.userData.targetOpacity !== undefined) {
          mat.opacity = sprite.userData.targetOpacity * easeProgress
        } else {
          mat.opacity = easeProgress
        }
        
        if (progress >= 1) {
          labelAnimations.delete(sprite)
        }
      })
      
      // 景点标记呼吸动画
      attractionMarkers.forEach((marker) => {
        const baseScale = marker.userData.baseScale || 12
        const time = (currentTime - (marker.userData.animationStartTime || currentTime)) / 1000
        const pulse = 1 + Math.sin(time * 2) * 0.15 // 15%的缩放变化
        marker.scale.set(baseScale * pulse, baseScale * pulse, 1)
        
        // 轻微的旋转
        marker.rotation.z = Math.sin(time * 0.5) * 0.1
      })
      
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(renderLoop)
    }
    renderLoop()

    const handlePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      
      // 先检测标签 sprite（因为它们可能在 mesh 上方，会遮挡点击）
      // 只检测当前视图级别下对应的标签
      const allSprites: THREE.Sprite[] = []
      labelSprites.forEach((sprite, mesh) => {
        // 在省级视图下，只检测市级 mesh 的标签
        // 在市级视图下，只检测县级 mesh 的标签
        if (viewLevelRef.current === 'province') {
          if (cityMeshes.includes(mesh) && isCityLevel(mesh.userData.name)) {
            allSprites.push(sprite)
          }
        } else if (viewLevelRef.current === 'city') {
          if (countyMeshes.includes(mesh)) {
            allSprites.push(sprite)
          }
        }
      })
      
      // 同时检测标签 sprite 和 mesh，优先处理距离更近的
      const allClickables: THREE.Object3D[] = [...allSprites, ...clickables]
      const hits = raycaster.intersectObjects(allClickables, false)
      
      if (hits.length > 0) {
        const hit = hits[0]
        if (hit.object instanceof THREE.Sprite) {
          // 点击到标签，找到对应的 mesh
          const hitSprite = hit.object as THREE.Sprite
          const mesh = hitSprite.userData.mesh as THREE.Mesh | undefined
          if (mesh && clickables.includes(mesh)) {
            applyHighlight(mesh)
            return
          }
        } else if (hit.object instanceof THREE.Mesh) {
          // 直接点击到 mesh
          applyHighlight(hit.object)
        }
      }
    }
    renderer.domElement.addEventListener('pointerdown', handlePointer)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('pointerdown', handlePointer)
      resetAllHighlights()
      controls.dispose()
      objects.forEach((obj) => scene.remove(obj))
      geometries.forEach((geo) => geo.dispose())
      materials.forEach((mat) => mat.dispose())
      labelSprites.forEach((sprite) => {
        scene.remove(sprite)
        sprite.material.dispose()
        ;(sprite.material as THREE.SpriteMaterial).map?.dispose()
      })
      labelSprites.clear()
      renderer.dispose()
      scene.clear()
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>河北省旅游景点</h1>
        </div>
        <button 
          className="fullscreen-btn"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? '退出全屏' : '进入全屏'}
          title={isFullscreen ? '退出全屏' : '进入全屏'}
        >
          {isFullscreen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
        </button>
      </header>

      <div className="main-grid">
        <aside className="panel left-panel">
          {/* 景点列表 */}
          <div className="attractions-section">
            <div className="attractions-title">
              {selectedCity ? `${cityData[selectedCity]?.name || selectedCity}景点列表` : '全省景点列表'}
            </div>
            <div className="filter-bar">
              {[
                { key: 'all', label: '全部' },
                { key: '5A', label: '5A' },
                { key: '4A', label: '4A' },
                { key: '山脉', label: '山脉' },
                { key: '河流', label: '河流' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  className={`filter-chip ${attractionFilter === opt.key ? 'active' : ''}`}
                  onClick={() => setAttractionFilter(opt.key as typeof attractionFilter)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="attractions-list">
              {filteredAttractions.length > 0 ? (
                filteredAttractions.map((attraction, index) => (
                  <div key={index} className="attraction-item">
                    <div className="attraction-header">
                      <span className={`attraction-level attraction-level-${attraction.level}`}>
                        {attraction.type || attraction.level}
                      </span>
                      <div className="attraction-name">{attraction.name}</div>
                    </div>
                  <div className="attraction-footer">
                    <div className="attraction-location">
                      {attraction.city} · {attraction.county}
                    </div>
                    <a
                      className="attraction-nav"
                      href={buildNavUrl(attraction)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      导航
                    </a>
                  </div>
                  </div>
                ))
              ) : (
                <div className="attraction-empty">暂无景点数据</div>
              )}
            </div>
          </div>
        </aside>

        <section className="center-panel">
          <div className="canvas-wrap">
            <div ref={containerRef} className="canvas-container" />
            {viewLevel === 'city' && (
              <button
                className="back-button"
                onClick={() => {
                  returnToProvinceRef.current?.()
                }}
              >
                返回省级视图
              </button>
            )}
            <div className="status">
              {error ? (
                <span className="error">加载失败：{error}</span>
              ) : (
                status
              )}
            </div>
          </div>
        </section>

        <aside className="panel right-panel">
          <div className="card-grid">
            {cityStats.statusCards.map((card) => (
              <div 
                className="status-card" 
                key={card.title} 
                style={{ 
                  borderColor: card.color,
                  color: card.color,
                }}
              >
                <div className="card-title">{card.title}</div>
                <div className="card-value">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="mini-chart">
            <div 
              ref={titleRef}
              className="mini-title"
              style={{
                opacity: 1,
                display: 'block',
                visibility: 'visible',
                animation: 'none',
                transform: 'none',
                position: 'relative',
                zIndex: 10,
              }}
            >
              {selectedCity ? `${cityData[selectedCity]?.name || selectedCity}景区分布` : '各市景区分布'}
            </div>
            <div 
              ref={legendRef}
              className="bar-legend"
              style={{
                opacity: 1,
                display: 'flex',
                visibility: 'visible',
                animation: 'none',
                transform: 'none',
                position: 'relative',
                zIndex: 10,
              }}
            >
              <span className="legend-a">5A级</span>
              <span className="legend-b">4A级</span>
            </div>
            <div className="bar-chart">
              {cityStats.barSeries.map((b, index) => {
                const maxA = Math.max(...cityStats.barSeries.map((s) => s.a), 4)
                const maxB = Math.max(...cityStats.barSeries.map((s) => s.b), 24)
                const isSelected = selectedCity && b.label === selectedCity
                return (
                  <div 
                    className={`bar-item ${isSelected ? 'bar-selected' : ''}`} 
                    key={`${b.label}-${selectedCity || 'default'}`}
                    style={{
                      order: isSelected ? -1 : index,
                    }}
                  >
                    <div className="bar-wrapper">
                      <div 
                        className={`bar-a ${isSelected ? 'bar-highlight' : ''}`}
                        style={{ 
                          height: `${Math.max((b.a / maxA) * 100, b.a > 0 ? 8 : 0)}%`,
                          minHeight: b.a > 0 ? '8px' : '0px',
                          transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
                        }}
                        title={`5A级: ${b.a}处`}
                      >
                        {b.a > 0 && <span className="bar-value">{b.a}</span>}
                      </div>
                      <div 
                        className={`bar-b ${isSelected ? 'bar-highlight' : ''}`}
                        style={{ 
                          height: `${Math.max((b.b / maxB) * 100, b.b > 0 ? 8 : 0)}%`,
                          minHeight: b.b > 0 ? '8px' : '0px',
                          transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
                        }}
                        title={`4A级: ${b.b}处`}
                      >
                        {b.b > 0 && <span className="bar-value">{b.b}</span>}
                      </div>
                    </div>
                    <span className={`bar-label ${isSelected ? 'label-selected' : ''}`}>{b.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="circle-cards">
            {cityStats.circleStats.map((c) => {
              const radius = 20
              const circumference = 2 * Math.PI * radius
              const offset = circumference - (c.value / 100) * circumference
              return (
                <div className="circle-card" key={c.label}>
                  <div className="circle-wrapper">
                    <svg className="circle-svg" width="50" height="50">
                      <circle
                        className="circle-bg"
                        cx="25"
                        cy="25"
                        r={radius}
                        fill="none"
                        stroke="rgba(124, 240, 255, 0.2)"
                        strokeWidth="3"
                      />
                      <circle
                        className="circle-progress"
                        cx="25"
                        cy="25"
                        r={radius}
                        fill="none"
                        stroke={c.color}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        transform="rotate(-90 25 25)"
                        style={{
                          filter: `drop-shadow(0 0 3px ${c.color})`,
                        }}
                      />
                    </svg>
                    <div className="circle-value circle-value-animate">{c.value.toFixed(1)}%</div>
                  </div>
                  <div className="circle-label">{c.label}</div>
                </div>
              )
            })}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default App

