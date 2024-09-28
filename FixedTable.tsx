import React, { Component, useContext, useImperativeHandle, useRef } from 'react';
import { LoadingContext } from '@/App';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Table, Rows, Col, TableWrapper } from 'react-native-table-component';
import { Dimensions } from 'react-native';

// const MATH_WIDTH = 100;

//判断是否是中文
const isChinese = (str: string) => {
    const chineseRegex = /[\u4e00-\u9fa5]/;
    return chineseRegex.test(str);
};

//中英文混合计算字符长度
export const getStrLen = (str: string) => {
    let strlength = 0;
    for (let i = 0; i < str.length; ++i) {
        if (isChinese(str.charAt(i)) == true) {
            strlength = strlength + 1.8;
        } //中文计算为2个字符
        else {
            strlength = strlength + 1;
        } //中文计算为1个字符
    }
    return strlength;
};
interface TableOption {
    title: string;
    field: string;
    width?: number;
    format?: (value: any) => any;
}

// 默认表头高
const defaultHeaderHeight = 37;

// 默认表单元格高
const defaultCellHeight = 50;

const defaultFormat = (value: any) => value ?? '-';

class CustomTable extends Component {
    // 下一页
    next: string = '';
    // 滚动部分列
    rowsScrollView: any;
    // 滚动部分表头
    headerScrollView!: ScrollView | null;
    // 是否正在滚动
    rigthIsScrolling: any;
    // 表头正在滚动
    headerIsScrolling = false;
    // 表格体列正在滚动
    rowsIsScrolling = false;
    // 表格配置
    tableOptions = [] as TableOption[];
    // 固定列
    fixedTableHeader = [];
    // 表格体引用
    tableBodyRef!: ScrollView | null;
    // 表格列宽
    tableCOlumnWidth: number | null;
    // 构造函数
    constructor(props: {
        params?: object;
        tableOptions: TableOption[];
        api: any;
        defaultTableData: any[];
        onRef: any;
        columnWidth?: number;
    }) {
        super(props);
        // 设置表格配置
        this.tableOptions = props.tableOptions;
        // 表格数据
        this.state = {
            tableData: props.defaultTableData || [],
        };
        const windowWidth = Dimensions.get('window').width;
        this.tableCOlumnWidth = props.columnWidth || (windowWidth - 24) / 4;

        this.headerIsScrolling = false;
        this.rowsIsScrolling = false;
    }

    // 获取固定列, 写死拆分第一列
    getFixedTableColumns = () => {
        return [''];
    };

    // 获取滚动列
    getScrollColumns = () => {
        const tableData = this.state.tableData.map((item: any) => {
            const value = item[this.tableOptions[0].field];
            const formatFunc = this.tableOptions[0].format || defaultFormat;
            return formatFunc(value);
        });
        return [tableData];
    };

    // 左边的固定列
    getFixedColumnsData = () => {
        return this.tableOptions.slice(1).map(col => col.title);
    };

    // 生成列表右边数据项
    getScrollColumnsData = () => {
        const arr: string[][] = [];
        this.tableOptions.slice(1).forEach(col => {
            const rowData = [] as any;
            this.state.tableData.forEach((item: any) => {
                const value = item[col.field];
                const formatFunc = col.format || defaultFormat;
                rowData.push(formatFunc(value));
            });
            arr.push(rowData);
        });
        return arr;
    };

    getList = async (forceRefresh = false) => {
        if (!this.props.api) {
            return;
        }
        this.props.setLoading?.(true);
        const res = await this.props.api({
            ...(this.props.params || {}),
            next: this.next,
            size: 20,
        });

        this.props.setLoading?.(false);
        const { code, data = { data: [] } } = res.data;
        if (code === '200') {
            const { data: _data, next } = data;
            this.next = next;
            if (forceRefresh) {
                this.setState({
                    tableData: _data,
                });
                return;
            }
            this.setState({
                tableData: [...this.state.tableData, ..._data],
            });
        }
    };

    fetchData = () => {
        // 有下一页则请求下一页
        this.next && this.getList();
    };

    componentDidMount(): void {
        this.getList(true);
    }

    // 表头左右滑动
    onHeaderSilde(event: any) {
        const offsetX = event.nativeEvent.contentOffset.x;
        if (!this.headerIsScrolling) {
            this.rowsIsScrolling = true;
            this.rowsScrollView.scrollTo({ x: offsetX, animated: false });
        }
        this.headerIsScrolling = false;
    }

    // 表格体左右滑动
    onBodySlide(event: any) {
        const offsetX = event.nativeEvent.contentOffset.x;
        if (!this.rigthIsScrolling) {
            this.headerIsScrolling = true;
            this.headerScrollView?.scrollTo({
                x: offsetX,
                animated: false,
            });
        }
        this.rigthIsScrolling = false;
        let width = event.nativeEvent.layoutMeasurement.width;
        let contentWidth = event.nativeEvent.contentSize.width;

        if (offsetX + width >= contentWidth - 0.5) {
            //已经滚动到底部
            this.fetchData();
        }
    }

    // 获取列宽 - 自动计算列宽
    getColWidthArr() {
        const widthArr: number[] = [];
        [
            ...this.getFixedTableColumns(),
            ...(this.getScrollColumns()[0] || []),
        ].forEach(() => {
            // ].forEach((item: any, index: number) => {
            // let maxLengthItem = item || '';
            // for (let i = 0; i < this.tableOptions.length - 1; i++) {
            //   // 列数据
            //   const rowData = [
            //     // 固定列的数据
            //     this.getFixedColumnsData()?.[i],
            //     ...(this.getScrollColumnsData()?.[i] || []),
            //   ];
            //   const value = rowData[index] || '-';
            //   if (String(value).length > maxLengthItem.length) {
            //     maxLengthItem = value;
            //   }
            // }
            // // console.log(maxLengthItem);
            // const strLen = getStrLen(maxLengthItem);
            widthArr.push(this.tableCOlumnWidth!);
        });
        return widthArr;
    }

    // 获取单元格高度
    getCellHeightArr() {
        return new Array(this.tableOptions.length).fill(defaultCellHeight);
    }

    async refresh() {
        this.next = '';
        await this.getList(true);
        this.headerScrollView?.scrollTo({ x: 0, animated: false });
    }

    render() {
        return (
            <View style={styles.container}>
                {/* 表头 */}
                <ScrollView>
                    <View style={{ flexDirection: 'row' }}>
                        {/* 固定列表头 */}
                        <Table
                            borderStyle={{
                                borderWidth: 0.5,
                                borderColor: '#fff',
                            }}>
                            <TableWrapper style={{ width: this.getColWidthArr()[0] }}>
                                <Col
                                    data={this.getFixedTableColumns()}
                                    textStyle={styles.headText}
                                    style={{ backgroundColor: '#D7E4FF' }}
                                    widthArr={this.getColWidthArr().slice(0, 1)}
                                    heightArr={[defaultHeaderHeight]}
                                />
                            </TableWrapper>
                        </Table>
                        {/* 剩余列表头 */}
                        <ScrollView
                            horizontal
                            ref={view => {
                                this.headerScrollView = view;
                            }}
                            showsHorizontalScrollIndicator={false}
                            scrollEventThrottle={16}
                            onScroll={event => this.onHeaderSilde(event)}>
                            <Table borderStyle={{ borderWidth: 0.5, borderColor: '#fff' }}>
                                <Rows
                                    data={this.getScrollColumns()}
                                    textStyle={styles.headText}
                                    style={{
                                        height: defaultHeaderHeight,
                                        backgroundColor: '#D7E4FF',
                                    }}
                                    widthArr={this.getColWidthArr().slice(1)}
                                />
                            </Table>
                        </ScrollView>
                    </View>
                </ScrollView>
                {/* 表格体 */}
                <ScrollView
                    style={{ height: '100%' }}
                    ref={view => {
                        this.tableBodyRef = view;
                    }}>
                    <View style={{ flexDirection: 'row' }}>
                        {/* 首列 */}
                        <Table
                            borderStyle={{
                                borderWidth: 0.5,
                                borderColor: '#EEEEEE',
                            }}>
                            <TableWrapper style={{ width: this.getColWidthArr()[0] }}>
                                <Col
                                    data={this.getFixedColumnsData()}
                                    textStyle={styles.text}
                                    heightArr={this.getCellHeightArr()}
                                />
                            </TableWrapper>
                        </Table>
                        {/* 剩余列 */}
                        <ScrollView
                            horizontal={true}
                            ref={view => {
                                this.rowsScrollView = view;
                            }}
                            scrollEventThrottle={16}
                            onScroll={event => this.onBodySlide(event)}>
                            <Table
                                borderStyle={{
                                    borderWidth: 0.5,
                                    borderColor: '#EEEEEE',
                                }}>
                                <Rows
                                    data={this.getScrollColumnsData()}
                                    textStyle={styles.text}
                                    style={{ height: defaultCellHeight }}
                                    widthArr={this.getColWidthArr().slice(1)}
                                />
                            </Table>
                        </ScrollView>
                    </View>
                </ScrollView>
            </View>
        );
    }
}

export const FixedTable = (props: any) => {
    const tableRef = useRef<CustomTable>(null);
    useImperativeHandle(props.onRef, () => {
        return {
            refresh: () => tableRef.current?.refresh?.(),
        };
    });
    const { setLoading } = useContext(LoadingContext);
    return <CustomTable ref={tableRef} {...props} setLoading={setLoading} />;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
    },
    headText: { marginLeft: 12, color: '#888888', lineHeight: 25 },
    text: {
        marginLeft: 12,
        color: '#222222',
        // lineHeight: 25,
        // paddingHorizontal: 4,
        paddingRight: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default FixedTable;
