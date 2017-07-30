'use strict';

import React, { Component } from 'react';
import {
  Button,
  Dimensions,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  TouchableHighlight
} from 'react-native';

import BottomNavigation, { Tab } from 'react-native-material-bottom-navigation';
import MailCompose from 'react-native-mail-compose';
import ModalWrapper from 'react-native-modal-wrapper';
import Swiper from 'react-native-swiper';
import Icon from 'react-native-vector-icons/MaterialIcons';

import FileStore from './store';
import styles, { colors, navigationConsts } from './styles';
import MembersView from './member';
import ExpensesView from './expense';
import SummaryView from './summary';
import { DeleteButton, DeleteConfirmDialog } from './utils';

let gStore = new FileStore();

class TripListScreen extends Component {
  static navigationOptions = ({ navigation }) => {
    const { setParams } = navigation;
    return {
      title: '記帳本',
      headerTitleStyle: styles.navigationHeaderTitle,
      headerStyle: styles.navigationHeader,
      headerRight: (
        <TouchableHighlight
          underlayColor="#008bcc"
          onPress={() => setParams({ editTripVisible: true })}
          style={[styles.iconBtn, styles.navIconBtn]}
        >
          <Icon name="add" size={30} color="#fff" />
        </TouchableHighlight>
      )
    };
  };

  constructor() {
    super();
    this.state = { id: -1, name: '', dataUpdateDetector: {} };
    this.store = gStore;
    this.store.setReadyCallback(() => {
      console.log('INFO: store is ready', this.store.isReady());
      this.setState({ dataUpdateDetector: {} });
    });
  }

  render() {
    // NOTE: params is undefined in the first call.
    const params = this.props.navigation.state.params ? this.props.navigation.state.params : {};

    return (
      <View style={styles.baseView}>
        <ModalWrapper
          style={{ width: 280, height: 180, paddingLeft: 18, paddingRight: 18 }}
          visible={!!params.editTripVisible}
        >
          <Text>帳本名稱</Text>
          <TextInput
            autoFocus={true}
            defaultValue={this.state.name}
            placeholder="阿里山 2017/01"
            placeholderTextColor="#bcbcbc"
            onChangeText={name => this.setState({ name })}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
            <TouchableHighlight
              onPress={() => this.onFinishEditTrip(false)}
              style={styles.popupBtn}
              underlayColor="#99d9f4"
            >
              <Text style={{ color: '#1e7d6a' }}>取消</Text>
            </TouchableHighlight>
            <TouchableHighlight
              onPress={() => this.onFinishEditTrip(true)}
              style={styles.popupBtn}
              underlayColor="#99d9f4"
            >
              <Text style={{ color: '#1e7d6a' }}>建立</Text>
            </TouchableHighlight>
          </View>
        </ModalWrapper>
        <DeleteConfirmDialog visible={!!params.deleteTripId} onRespond={this.onRespondDelete} />

        <FlatList
          style={{ flex: 1, paddingTop: 3 }}
          data={this.store.isReady() ? this.store.getTrips() : []}
          extraData={this.state.dataUpdateDetector}
          renderItem={({ item }) =>
            <TouchableOpacity
              style={styles.tripListItem}
              onPress={() => this.onClickTrip(item.id, item.name)}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="book" size={36} color="#007ab5" />
                <Text style={[styles.tableData, { color: '#007ab5', fontWeight: 'bold' }]}>
                  {item.name}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <TouchableHighlight
                  onPress={() => {
                    this.onEditTrip(item.id, item.name);
                  }}
                  underlayColor="#dfecf2"
                  style={styles.iconBtn}
                >
                  <Icon name="edit" size={28} color="#9bafb8" />
                </TouchableHighlight>
                <DeleteButton
                  onPress={() => {
                    this.onDeleteTrip(item.id);
                  }}
                />
              </View>
            </TouchableOpacity>}
        />
      </View>
    );
  }

  //--------------------------------------------------------------------
  // Helper methods.
  //--------------------------------------------------------------------
  onEditTrip(id, name) {
    this.setState({ id, name });
    this.props.navigation.setParams({ editTripVisible: true });
  }

  onFinishEditTrip(done) {
    if (!this.store.isReady()) {
      // Retry after 1s.
      setTimeout(() => {
        this.onFinishEditTrip(done);
      }, 1000);
      return;
    }

    if (done && this.state.name.length > 0) {
      if (this.state.id > 0) {
        this.store.updateTrip(this.state.id, this.state.name);
      } else {
        this.store.addTrip(this.state.name);
      }
    }

    this.props.navigation.setParams({ editTripVisible: false });
    this.setState({ id: -1, name: '' });
  }

  onDeleteTrip = id => {
    this.props.navigation.setParams({ deleteTripId: id });
  };

  onRespondDelete = okay => {
    let id = this.props.navigation.state.params.deleteTripId;
    this.props.navigation.setParams({ deleteTripId: 0 });
    if (okay) {
      this.store.deleteTrip(id);
    }
  };

  onClickTrip = (id, name) => {
    let members = this.store.getMembers(id);
    let activeTab =
      !members || members.length <= 0
        ? TripContentScreen.Tabs.Members
        : TripContentScreen.Tabs.Expenses;
    this.props.navigation.navigate('Trip', { title: name, tripId: id, activeTab });
  };
}

class TripContentScreen extends Component {
  // The value is the tab index.
  static Tabs = {
    Members: 0,
    Expenses: 1,
    Summary: 2
  };

  static navigationOptions = ({ navigation }) => {
    const { state, setParams, navigate } = navigation;
    const { params } = state;
    let headerRight = {};
    if (params.activeTab === TripContentScreen.Tabs.Members) {
      headerRight = (
        <Button
          title="新增成員"
          color={navigationConsts.buttonColor}
          onPress={() => {
            setParams({ editorVisible: true });
          }}
        />
      );
    } else if (params.activeTab === TripContentScreen.Tabs.Expenses) {
      headerRight = (
        <Button
          title="新增消費"
          color={navigationConsts.buttonColor}
          onPress={() => {
            navigate('AddExpense', {
              tripId: params.tripId,
              title: params.title,
              store: gStore,
              notifyDataUpdated: params.notifyExpensesUpdated
            });
          }}
        />
      );
    } else {
      headerRight = (
        <Button
          title="匯出 CSV"
          color={navigationConsts.buttonColor}
          onPress={() => {
            params.exportCSV();
          }}
        />
      );
    }

    return {
      title: params.title,
      headerTitleStyle: styles.navigationHeaderTitle,
      headerStyle: styles.navigationHeader,
      headerTintColor: navigationConsts.tintColor,
      headerRight
    };
  };

  constructor() {
    super();
    this.store = gStore;
    this.state = { notifyExpensesUpdated: {} };
    this.swiper = null;
  }

  componentWillMount() {
    const { setParams } = this.props.navigation;
    setParams({
      notifyExpensesUpdated: this.onExpensesUpdated,
      exportCSV: this.exportCSV
    });
  }

  render() {
    const { params } = this.props.navigation.state;

    // params.editorVisible may be undefined.
    let editorVisible = !!params.editorVisible;
    let showEditor = visible => {
      this.props.navigation.setParams({ editorVisible: visible });
    };
    let activeIconColor = navigationConsts.backgroundColor;
    let barBackgroundColor = colors.base;

    // NOTE:
    // 1. BottomNavigation doesn't occupy the space.
    // 2. Swiper uses fixed width/height to make it fullscreen. Need override the height manually.
    return (
      <View style={styles.baseView}>
        <Swiper
          height={Dimensions.get('window').height - navigationConsts.height - 80}
          loop={false}
          showsPagination={false}
          index={params.activeTab}
          ref={swiper => {
            this.swiper = swiper;
          }}
          onMomentumScrollEnd={this.onSwiperDidUpdateIndex}
          onWillUpdateIndex={this.onSwiperWillUpdateIndex}
        >
          <MembersView
            store={this.store}
            navigation={this.props.navigation}
            tripId={params.tripId}
            showEditor={showEditor}
            editorVisible={editorVisible}
          />
          <ExpensesView
            store={this.store}
            navigation={this.props.navigation}
            tripId={params.tripId}
            showEditor={showEditor}
            editorVisible={editorVisible}
            setNotifyExpensesUpdated={this.setNotifyExpensesUpdated}
          />
          <SummaryView store={this.store} tripId={params.tripId} />
        </Swiper>
        <View style={{ flex: 1, backgroundColor: 'black' }} />
        <BottomNavigation
          activeTab={params.activeTab}
          labelColor="black"
          activeLabelColor="#007ab5"
          rippleColor="black"
          style={{ height: 56, elevation: 8, position: 'absolute', left: 0, bottom: 0, right: 0 }}
          onTabChange={newTabIndex => {
            this.onTabChange(newTabIndex);
          }}
        >
          <Tab
            label="成員"
            icon={<Icon name="people" size={20} />}
            activeIcon={<Icon name="people" size={20} color={activeIconColor} />}
            barBackgroundColor={barBackgroundColor}
          />
          <Tab
            label="消費記錄"
            icon={<Icon name="monetization-on" size={20} />}
            activeIcon={<Icon name="monetization-on" size={20} color={activeIconColor} />}
            barBackgroundColor={barBackgroundColor}
          />
          <Tab
            label="結算"
            icon={<Icon name="receipt" size={20} />}
            activeIcon={<Icon name="receipt" size={20} color={activeIconColor} />}
            barBackgroundColor={barBackgroundColor}
          />
        </BottomNavigation>
      </View>
    );
  }

  //--------------------------------------------------------------------
  // Helper methods.
  //--------------------------------------------------------------------
  onExpensesUpdated = () => {
    this.state.notifyExpensesUpdated();
  };

  onTabChange = index => {
    const { params } = this.props.navigation.state;

    if (index != params.activeTab) {
      this.swiper.scrollTo(index, true);
      this.props.navigation.setParams({ activeTab: index });
    }
  };

  onSwiperDidUpdateIndex = (e, state, context) => {
    // NOTE: updating the active tab here is a little slow compared to
    // do this in onSwiperWillUpdateIndex.
  };

  onSwiperWillUpdateIndex = newIndex => {
    this.props.navigation.setParams({ activeTab: newIndex });
  };

  setNotifyExpensesUpdated = func => {
    this.state.notifyExpensesUpdated = func;
  };

  exportCSV = () => {
    this.sendMail();
  };

  async sendMail() {
    try {
      const { params } = this.props.navigation.state;
      let content = this.store.exportFullAsCSV(params.tripId);
      await MailCompose.send({
        subject: params.title + '結算',
        html: '請用 Google Spreadsheet / Excel 開啟附件',
        attachments: [
          {
            filename: 'summary',
            ext: '.csv',
            mimeType: 'text/csv',
            text: content
          }
        ]
      });
    } catch (e) {
      alert('Failed to mail: e=' + e);
    }
  }
}

export { TripListScreen, TripContentScreen };
