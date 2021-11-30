// import { asyncRoutes, constantRoutes } from '@/router'
// import { fetchUserMenuList } from '@/api/user'
// import Layout from '@/layout'

// /**
//  * 静态路由懒加载
//  * @param view  格式必须为 xxx/xxx 开头不要加斜杠
//  * @returns
//  */
// export const loadView = (view) => {
//   return (resolve) => require([`@/views/${view}.vue`], resolve)
// }

// /**
//  * 把从后端查询的菜单数据拼装成路由格式的数据
//  * @param routes
//  * @param data 后端返回的菜单数据
//  */
// export function generaMenu(routes, data) {
//   data.forEach(item => {
//     const menu = {
//       path: item.url,
//       component: item.component === '#' ? Layout : loadView(item.component),
//       hidden: item.status === 0, // 状态为0的隐藏
//       redirect: item.redirect,
//       children: [],
//       name: item.code,
//       meta: item.meta
//     }

//     if (item.children) {
//       generaMenu(menu.children, item.children)
//     }
//     routes.push(menu)
//   })
//   return routes
// }

// const state = {
//   routes: [],
//   addRoutes: []
// }

// const mutations = {
//   SET_ROUTES: (state, routes) => {
//     state.addRoutes = routes
//     // 拼接静态路由和动态路由
//     state.routes = constantRoutes.concat(routes)
//   }
// }

// const actions = {
//   generateRoutes({ commit }, token) {
//     return new Promise(resolve => {
//       // 通过token从后端获取用户菜单，并加入全局状态
//       fetchUserMenuList(token).then(res => {
//         const menuData = Object.assign([], res.data)
//         const tempAsyncRoutes = Object.assign([], asyncRoutes)
//         const accessedRoutes = generaMenu(tempAsyncRoutes, menuData)

//         commit('SET_ROUTES', accessedRoutes)
//         resolve(accessedRoutes)
//       }).catch(error => {
//         console.log(error)
//       })
//     })
//   }
// }

// export default {
//   namespaced: true,
//   state,
//   mutations,
//   actions
// }
import { asyncRoutes, constantRoutes } from '@/router'
import { getAuthMenu } from '@/api/user'
import Layout from '@/layout'

/**
 * Use meta.role to determine if the current user has permission
 * @param roles
 * @param route
 */

function hasPermission(roles, route) {
  if (route.meta && route.meta.roles) {
    return roles.some(role => route.meta.roles.includes(role))
  } else {
    return true
  }
}

/**
 * 后台查询的菜单数据拼装成路由格式的数据
 * @param routes
 */
export function generaMenu(routes, data) {
  data.forEach(item => {
    // alert(JSON.stringify(item))
    const menu = {
      path: item.path === '#' ? item.id + '_key' : item.path,
      // component: item.component === '#' ? Layout : () => import(`@/views${item.component}`),
      component: item.component === '#' ? Layout : () => require([`@/views/${item.component}.vue`]),
      hidden: item.hidden,
      redirect: item.redirect,
      children: [],
      name: 'menu_' + item.id,
      meta: item.meta
      // meta: { title: item.name, id: item.id, roles: ['admin'] }
    }
    console.log(menu)
    if (item.children) {
      generaMenu(menu.children, item.children)
    }
    routes.push(menu)
  })
}

/**
 * Filter asynchronous routing tables by recursion
 * @param routes asyncRoutes
 * @param roles
 */
export function filterAsyncRoutes(routes, roles) {
  const res = []
  routes.forEach(route => {
    const tmp = { ...route }
    if (hasPermission(roles, tmp)) {
      if (tmp.children) {
        tmp.children = filterAsyncRoutes(tmp.children, roles)
      }
      res.push(tmp)
    }
  })
  return res
}

const state = {
  routes: [],
  addRoutes: []
}

const mutations = {
  SET_ROUTES: (state, routes) => {
    state.addRoutes = routes
    state.routes = constantRoutes.concat(routes)
  }
}

const actions = {
  generateRoutes({ commit }, roles) {
    return new Promise(resolve => {
      const loadMenuData = []
      // 先查询后台并返回左侧菜单数据并把数据添加到路由
      getAuthMenu(state.token).then(response => {
        let data = response
        if (response.code !== 200) {
          alert(JSON.stringify('菜单数据加载异常'))
          // throw new Error('菜单数据加载异常')
        } else {
          data = response.data
          Object.assign(loadMenuData, data)
          const tempAsyncRoutes = Object.assign([], asyncRoutes)
          // tempAsyncRoutes = asyncRoutes
          console.log('loadMenuData')
          console.log(loadMenuData)
          generaMenu(tempAsyncRoutes, loadMenuData)
          let accessedRoutes
          if (roles.includes('admin')) {
            // alert(JSON.stringify(asyncRoutes))
            accessedRoutes = tempAsyncRoutes || []
          } else {
            accessedRoutes = filterAsyncRoutes(tempAsyncRoutes, roles)
          }
          commit('SET_ROUTES', accessedRoutes)
          resolve(accessedRoutes)
        }
        // generaMenu(asyncRoutes, data)
      }).catch(error => {
        console.log(error)
      })
    })
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
