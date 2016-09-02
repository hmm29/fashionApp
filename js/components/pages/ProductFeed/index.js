/**
* ProductFeed.js
* See Product info
*
* @providesModule ProductFeed
* @flow
*/

'use strict'; /* enables JS strict mode for any ES5 code */

/*
* imports required modules
*/

import React, { PropTypes } from 'react';
import {
 Dimensions,
 Image,
 StyleSheet,
 View,
 Text,
} from 'react-native';

import _ from 'lodash';
import BackIcon from '../../partials/icons/navigation/BackIcon';
import Button from 'apsl-react-native-button';
import CatalogViewIcon from '../../partials/icons/product/CatalogViewIcon';
import EyespotNegativeLogo from '../../partials/img/eyespot-logo-negative.png';
import EyespotPageBase from '../EyespotPageBase';
import Header from '../../partials/Header';
import Footer from '../../partials/Footer';
import FilterBar from '../../partials/FilterBar';
import Map from '../../partials/Map';
import MapsViewIcon from '../../partials/icons/product/MapsViewIcon';
import Product from '../../partials/Product';
import Swiper from 'react-native-swiper';

import firebaseApp from '../../firebase';

var {height, width} = Dimensions.get('window'); /* gets screen dimensions */
var SWIPER_REF = 'ProductFeedSwiper';
var SIZE_OF_PRODUCT_ITEM = height * 0.9;

String.prototype.capitalize = function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

/*
* defines the ProductFeed class
* this is the code for the feed of products after tapping a panel
*/


function addKeyToProducts(allProducts){
  var product_keys = Object.keys(allProducts);
  var products = allProducts;
  product_keys.map(function(key){
    products[key]['.key'] = key;
  })
  return products
}

/*
* defines the ProductFeed class
*/

var ProductFeed = React.createClass({

   /*
    * specifies types for properties that this component receives
    */

   propTypes: {
     navigator: PropTypes.object,
     categoryKey: PropTypes.string
   },

   getInitialState(){
     return {
       catalogViewIconActive: true,
       dataStore: '',
       historyFilter: 'Last Month',
       mapsViewIconActive: false,
     }
   },

   // HACK: keep track of currentProductSwiper item index here in instance variable
   // doing so in state object will cause unwanted rerenders when index updated
   currentProductSwiperPageIndex: 0,
   offset: 0,

   componentWillMount(){
     var ref = firebaseApp.database().ref();
     ref.on('value', (snap) => {
       if(snap.val()){
         this.setState({
           dataStore : snap.val(),
         })
       }
     });
   },

   filterProductsByCategory(){
     var dataStore = this.state.dataStore;
     const products = dataStore.products || [];
     if(!dataStore){ return null };

     const categories = dataStore.category || {};
     var filteredProducts;
     var productKeys = categories[this.props.categoryKey] ?
       Object.values(categories[this.props.categoryKey]) : [];

     var allProducts = addKeyToProducts(products);

     if(this.props.categoryKey === 'all_m') {
       // filter the category keys to ones for men only
       let filteredCategoryKeys = Object.keys(categories).filter(key => {
         return key.indexOf('_m') > -1
       });

       // collect the product keys for these categories
       let allProductKeys = filteredCategoryKeys.map(key => {
         return Object.values(categories[key]);
       })

       // flatten the nested array into a one-dimensional array of products
       // of only men's items
       productKeys = _.flatten(allProductKeys);

     } else if (this.props.categoryKey === 'all_w') {
       // filter the category keys to ones for men only
       let filteredCategoryKeys = Object.keys(categories).filter(key => {
         return key.indexOf('_w') > -1
       });

       // collect the product keys for these categories
       let allProductKeys = filteredCategoryKeys.map(key => {
         return Object.values(categories[key]);
       })

       // flatten the nested array into a one-dimensional array of products
       // of only women's items
       productKeys = _.flatten(allProductKeys);
     }

       filteredProducts = productKeys.map((productKey) => {
         return allProducts[productKey];
       });

     return filteredProducts;

   },

   /*
    * navigateBack(): navigate back in product feed between products
    * and back to discover page if already at top of list
    */

   navigateBack() {
     if(this.state.catalogViewIconActive && this.currentProductSwiperPageIndex > 0) {
       this.refs[SWIPER_REF].scrollBy(-1);
     } else {
       this.props.navigator.pop();
     }
   },

   onPressMapEmblem() {
     this.setState({catalogViewIconActive: true, mapsViewIconActive: false});
   },

   /*
    * onScroll(): keep track of product flipboard item index and direction of swiping
    */

   onScroll(event) {
      var currentOffset = event.nativeEvent.contentOffset.x;
      var direction = currentOffset > this.offset ? 'right' : 'left';
      var hasChangedItem = Math.abs(currentOffset-this.offset) > SIZE_OF_PRODUCT_ITEM;
      this.offset = currentOffset;

      if(direction == 'right' && hasChangedItem) {
        this.currentProductSwiperPageIndex = this.currentProductSwiperPageIndex+1;
      }
      else if (direction === 'left' && hasChangedItem) {
        this.currentProductSwiperPageIndex = this.currentProductSwiperPageIndex-1;
      }
  },

    /*
    * _renderFooter(): renders the imported footer component
    */

   _renderFooter() {
     return (
         <Footer navigator={this.props.navigator} />
     );
   },

   /*
    * _renderHeader(): renders the imported header component
    */

   _renderHeader() {
      let { categoryName } = this.props;
      categoryName = categoryName.capitalize();
      let ampersandIdx = categoryName.indexOf('&');

       return (
         <Header containerStyle={styles.headerContainer}>
           <BackIcon color='white' onPress={this.navigateBack} />
           <View style={styles.pageTitle}>
             <Image source={EyespotNegativeLogo}
                   style={styles.pageTitleLogo} />
             <Text style={styles.pageTitleText}>{(categoryName.length > 12 ? categoryName.substring(0,ampersandIdx+1) + ' ...' : categoryName)}</Text>
           </View>
           <View style={{width: width/6, left: width/9, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center'}}>
               <CatalogViewIcon isActive={this.state.catalogViewIconActive} onPress={() => this.setState({catalogViewIconActive: true, mapsViewIconActive: false})} />
               <MapsViewIcon isActive={this.state.mapsViewIconActive} onPress={() => this.setState({catalogViewIconActive: false, mapsViewIconActive: true})} />
           </View>
         </Header>
       );
   },

   setFilter(type, filterName){
     if(type == "History"){
       this.setState({ historyFilter : filterName });
     }
   },

   /*
    * render(): returns JSX that declaratively specifies page UI
    */

   render() {
     var { categoryKey, navigator } = this.props;

     var filteredProducts = this.filterProductsByCategory();
     if(!filteredProducts){ return null }
     else {
       var vicinity = filteredProducts[0] && filteredProducts[0].store
       && filteredProducts[0].store.vicinity;
       var lastCommaInVicinity = vicinity.lastIndexOf(',');
       var city = vicinity.slice(lastCommaInVicinity+1);
       if(city.indexOf('Washington') > -1) city = 'Washington, D.C.'
       else city = ''
     }

     const filters = [
       {
         'name' : 'Last Month',
         dropdown : ['Last Week', 'Last Month', 'Last Year'],
       },
       {
         'name' : 'Location',
         dropdown: [city]
       },
     ]

     const products = (
       <View style ={styles.products}>
         <Swiper ref={SWIPER_REF}
                 index={this.currentProductSwiperPageIndex}
                 bounces={false}
                 loop={false}
                 horizontal={false}
                 onScroll={this.onScroll}
                 scrollEnabled={true}
                 scrollEventThrottle={-1000}
                 showsPagination={false}
                 style={styles.wrapper}>
                 {filteredProducts.map((product, i) => {

                 /*
                  * return Product component for each product
                  */

                  const user = product && this.state.dataStore.users[product.userId];

                  return (
                    <View style={styles.slide}>
                      <Product
                        key={i}
                        navigator={navigator}
                        onPressMapEmblem={() => {navigator.pop(); this.onPressMapEmblem()}}
                        product={product}
                        user={user}/>
                    </View>
                  );
                },this)}
         </Swiper>
       </View>
     )

     return (
       <View style={styles.layeredPageContainer}>
         {this._renderHeader()}
         <EyespotPageBase
           keyboardShouldPersistTaps={false}
           noScroll={true}>
           <View style={styles.container}>
            {this.state.catalogViewIconActive ?
             products :
               <Map onPressMapEmblem={this.onPressMapEmblem} products={[filteredProducts[this.currentProductSwiperPageIndex]]} />
             }
           </View>
         </EyespotPageBase>
         {this.state.mapsViewIconActive ? <FilterBar setFilter={this.setFilter} historyFilter={this.state.historyFilter} locationFilter={city} filters={filters} /> : <View/>}
         {this._renderFooter()}
       </View>
     );
   }
});

/*
* CSS stylings
*/


const styles = StyleSheet.create({
    container: {
    },
    products: {
      flexDirection: 'column',
      justifyContent: 'flex-start',
    },
    headerContainer: {
      backgroundColor: '#000',
      bottom: height/45
    },
    layeredPageContainer: {flex: 1},
    pageTitle: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      bottom: height / 200
    },
    pageTitleLogo: {
      alignSelf: 'center',
      backgroundColor: 'transparent',
      width: width / 3.9,
      height: height / 30,
      resizeMode: Image.resizeMode.contain
    },
    pageTitleText: {
      color: '#fff',
      fontSize: height / 42,
      fontFamily: 'BodoniSvtyTwoITCTT-Book'
    },
    slide: {
      backgroundColor: 'transparent',
      paddingTop: height/19,
      width
    },
    wrapper: {
      backgroundColor: '#fff',
      width
    }
});

/*
* exports this component as a module so it can be imported into other modules
*/

module.exports = ProductFeed;
