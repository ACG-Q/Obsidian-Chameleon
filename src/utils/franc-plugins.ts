import data from "src/resources/franc-plugins/data.json"

const covertData: Record<string, string> = data


/**
 * 将指定的字符串转换为另一种表示形式
 *
 * 此函数的作用是通过查找一个预定义的映射（covertData）将输入的字符串转换为对应的值
 * 它体现了一种多对一的映射关系，即多个输入值可能映射到同一个输出值
 * 主要应用场景包括但不限于数据格式转换、编码转换等
 *
 * @param francCode 待转换的字符串，默认为空字符串如果未提供参数，将返回空字符串
 * @returns {string} 转换后的字符串如果输入的字符串没有对应的转换结果，将返回原始字符串
 */
const convert3To1 = (francCode = ''): string => {
	const iso6931: string = covertData[francCode]
	if (iso6931) {
		return iso6931
	} else {
		console.log(`[convert3To1] 找不到对应的iso6931:${francCode}`)
		return ''
	}
}


export default convert3To1
