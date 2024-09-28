import React, {Component, useContext, useImperativeHandle, useRef} from 'react';
import {LoadingContext} from '@/App';
import {StyleSheet, View, ScrollView} from 'react-native';
import {Table, Rows, Col, TableWrapper} from 'react-native-table-component';

//判断是否是中文
const isChinese = (str: string) => {
  let lst = /[u00-uFF]/;
  return !lst.test(str);
};

//中英文混合计算字符长度
export const getStrLen = (str: string) => {
  let strlength = 0;
  for (let i = 0; i < str.length; ++i) {
    if (isChinese(str.charAt(i)) == true) {
      strlength = strlength + 2;
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
const defaultCellHeight = 40;

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
  // 构造函数
  constructor(props: {
    params?: object;
    tableOptions: TableOption[];
    api: any;
    defaultTableData: any[];
    onRef: any;
  }) {
    super(props);
    // 设置表格配置
    this.tableOptions = props.tableOptions;
    // 表格数据
    this.state = {
      tableData: props.defaultTableData || [],
    };
    this.headerIsScrolling = false;
    this.rowsIsScrolling = false;
  }

  // 获取固定列, 写死拆分第一列
  getFixedTableColumns = () => {
    return [this.tableOptions[0].title];
  };

  // 获取滚动列
  getScrollColumns = () => {
    return [this.tableOptions.slice(1).map(col => col.title)];
  };

  // 左边的固定列
  getFixedColumnsData = () => {
    const tableData = this.state.tableData.map((item: any) => {
      const value = item[this.tableOptions[0].field];
      const formatFunc = this.tableOptions[0].format || defaultFormat;
      return formatFunc(value);
    });
    return tableData;
  };

  // 生成列表右边数据项
  getScrollColumnsData = () => {
    const arr: string[][] = [];
    this.state.tableData.forEach((item: any) => {
      const rowData = [] as any;
      this.tableOptions.slice(1).forEach(col => {
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
    const params = {
      ...(this.props.params || {}),
      next: this.next,
      size: 20,
    };
    const res = await this.props.api(params);
    this.props.setLoading?.(false);
    const {code, data} = res.data;
    if (code === '200') {
      const {data: _data, next} = data;
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
      this.rowsScrollView.scrollTo({x: offsetX, animated: false});
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
  }

  // 表格体滚动
  onBodyScroll(event: any) {
    let y = event.nativeEvent.contentOffset.y;
    let height = event.nativeEvent.layoutMeasurement.height;
    let contentHeight = event.nativeEvent.contentSize.height;
    if (y + height >= contentHeight - 0.5) {
      //已经滚动到底部
      this.fetchData();
    }
  }

  // 获取列宽 - 自动计算列宽
  getColWidthArr() {
    return this.tableOptions.map(col => {
      if (col.width) {
        return col.width;
      }
      // 找到最长的数据
      let maxLengthItem = col.title;
      this.state.tableData.forEach((item: any) => {
        const formatFunc = col.format || defaultFormat;
        const value = String(formatFunc(item[col.field]));
        if (value.length > maxLengthItem.length) {
          maxLengthItem = value;
        }
      });
      const strLen = getStrLen(maxLengthItem);
      return strLen * (this.state.tableData.length ? 10 : 12);
    });
  }

  // 获取单元格高度
  getCellHeightArr() {
    return new Array(this.state.tableData.length).fill(defaultCellHeight);
  }

  refresh() {
    this.next = '';
    this.getList(true);
    this.tableBodyRef?.scrollTo({y: 0, animated: false});
  }

  render() {
    return (
      <View style={styles.container}>
        {/* 表头 */}
        <ScrollView>
          <View style={{flexDirection: 'row'}}>
            {/* 固定列表头 */}
            <Table
              borderStyle={{
                borderWidth: 0.5,
                borderColor: '#fff',
              }}>
              <TableWrapper style={{width: this.getColWidthArr()[0]}}>
                <Col
                  data={this.getFixedTableColumns()}
                  textStyle={styles.headText}
                  style={{backgroundColor: '#D7E4FF'}}
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
              <Table borderStyle={{borderWidth: 0.5, borderColor: '#fff'}}>
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
          style={{height: '100%'}}
          ref={view => {
            this.tableBodyRef = view;
          }}
          onScroll={event => this.onBodyScroll(event)}>
          <View style={{flexDirection: 'row'}}>
            {/* 首列 */}
            <Table
              borderStyle={{
                borderWidth: 0.5,
                borderColor: '#EEEEEE',
              }}>
              <TableWrapper style={{width: this.getColWidthArr()[0]}}>
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
                  style={{height: defaultCellHeight}}
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
  const {setLoading} = useContext(LoadingContext);
  return <CustomTable ref={tableRef} {...props} setLoading={setLoading} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  headText: {marginLeft: 12, color: '#888888'},
  text: {marginLeft: 12, color: '#222222'},
});

export default FixedTable;
