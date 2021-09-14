/* author: er567 */
const wax = new waxjs.WaxJS({
  rpcEndpoint: 'https://wax.greymass.com',
  tryAutoLogin: false
});

//automatically check for credentials
autoLogin();

//checks if autologin is available 
async function autoLogin() {
    let isAutoLoginAvailable = await wax.isAutoLoginAvailable();
    if (isAutoLoginAvailable) {
      let userAccount = wax.userAccount;
      let pubKeys = wax.pubKeys;
      let str = 'Account: ' + userAccount
      document.getElementById('autologin').insertAdjacentHTML('beforeend', str);
      $('#login').hide()
      initSetInterval()
    }
    else {
      document.getElementById('autologin').insertAdjacentHTML('beforeend', '请先手动登录一次并勾选自动登录');
    }
}

async function login() {
  try {
    //if autologged in, this simply returns the userAccount w/no popup
    let userAccount = await wax.login();
    let pubKeys = wax.pubKeys;
    let str = 'Account: ' + userAccount
    document.getElementById('loginresponse').insertAdjacentHTML('beforeend', str);
    console.log('登录成功')
    initSetInterval()
  } catch (e) {
      document.getElementById('loginresponse').append(e.message);
  }
}

async function sign(actions) {
  const _this = this
  if(!wax.api) {
    return alert('请先登录')
  }

  try {
    const result = await wax.api.transact({
      actions: actions
    }, {
      blocksBehind: 3,
      expireSeconds: 30
    });
    console.log(result)
    if (farm.taskList.length) {
      farm.reqTask()
    }
  } catch(e) {
    document.getElementById('loginresponse').append(e.message);
    if (farm.taskList.length) {
      farm.reqTask()
    }
  }
}

async function first_sign() {
  if(!wax.api) {
    return alert('请先登录')
  }
  try {
    const result = await wax.api.transact({
      actions: [{
        account: 'farmersworld',
        name: 'recover',
        authorization: [{
          actor: wax.userAccount,
          permission: 'active',
        }],
        data: {
          owner: wax.userAccount,
          energy_recovered: 1
        },
      }]
    }, {
      blocksBehind: 3,
      expireSeconds: 30
    });
    $('#first_sign').hide()
  } catch(e) {
    document.getElementById('loginresponse').append(e.message);
  }
}

const farm = {
  toolList: [],
  taskList: [],
  getTools: function() {
    const _this = this
    $.ajax({
      contentType:"application/json; charset=utf-8",
      dataType:"json",
      type: "POST",
      url: 'https://api.wax.alohaeos.com/v1/chain/get_table_rows',
      data: JSON.stringify({"json":true,"code":"farmersworld","scope":"farmersworld","table":"tools","lower_bound":wax.userAccount,"upper_bound":wax.userAccount,"index_position":2,"key_type":"i64","limit":"100","reverse":false,"show_payer":false}),
      success: function(res) {
        _this.toolList = [..._this.toolList,...res.rows]
        $('#tools').html(JSON.stringify(_this.toolList))
        const now = parseInt(new Date().getTime() / 1000)
        _this.toolList.map(async v => {
          // 恢复耐久
          if (v.current_durability < 20) {
            console.warn(v.asset_id, '可以修复')
            // _this.repair(v.asset_id)
            _this.taskList.push({
              type: 'repair',
              asset_id: v.asset_id
            })
          }
          // mine
          if (now >= v.next_availability) {
            console.warn(v.asset_id, '可以mine')
            // _this.mine(v.asset_id)
            _this.taskList.push({
              type: 'mine',
              asset_id: v.asset_id
            })
          }

        })
        if (_this.taskList.length) {
          $('#jobs').html('任务列表'+JSON.stringify(_this.taskList))
          _this.reqTask()
        } else {
          $('#jobs').html('暂无任务')
        }
      }
    })
  },
  getMbs: function () {
    const _this = this
    $.ajax({
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      type: 'POST',
      url: 'https://api.wax.alohaeos.com/v1/chain/get_table_rows',
      data: JSON.stringify({
        json: true,
        code: "farmersworld",
        index_position: 2,
        key_type: "i64",
        limit: "100",
        lower_bound: wax.userAccount,
        reverse: false,
        scope: "farmersworld",
        show_payer: false,
        table: "mbs",
        upper_bound: wax.userAccount,
      }),
      success: function (res) {
        _this.toolList = [..._this.toolList,...res.rows]
        $('#tools').html(JSON.stringify(_this.toolList))
        const now = parseInt(new Date().getTime() / 1000)
        _this.toolList.map(async (v) => {
          // mine
          if (now >= v.next_availability) {
            console.warn(v.asset_id, '可以mine')
            _this.taskList.push({
              type: 'mbsclaim',
              asset_id: v.asset_id,
            })
          }
        })
        if (_this.taskList.length) {
          $('#jobs').html('任务列表' + JSON.stringify(_this.taskList))
          _this.reqTask()
        } else {
          $('#jobs').html('暂无任务')
        }
      },
    })
  },
  getAccounts: function (setOrigin) {
    const _this = this
    $.ajax({
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      type: 'POST',
      url: 'https://api.wax.alohaeos.com/v1/chain/get_table_rows',
      data: JSON.stringify({
        code: "farmersworld",
        index_position: 1,
        json: true,
        key_type: "i64",
        limit: "100",
        lower_bound: wax.userAccount,
        reverse: false,
        scope: "farmersworld",
        show_payer: false,
        table: "accounts",
        upper_bound: wax.userAccount
      }),
      success: function (res) {
        if (setOrigin) {
          $('#origin_accounts').html(JSON.stringify(res.rows[0].balances))
        } else {
          $('#accounts').html(JSON.stringify(res.rows[0].balances))
          $('#energy').html('当前体力值：' +JSON.stringify(res.rows[0].energy))
          $('#max').html('最大体力值：' +JSON.stringify(res.rows[0].max_energy))
          if(res.rows[0].energy<100){
            _this.recover(res.rows[0].max_energy-res.rows[0].energy)
          }
        }
      }
    })
  },
  reqTask: function() {
    const task = this.taskList[0]
    console.log(task)
    if (task.type === 'repair') {
      this.repair(task.asset_id)
    } else {
      this.mine(task.asset_id, task.type)
    }
    this.taskList.shift()
  },
  mine: async function(asset_id, task_name) {
    sign([{
      account: 'farmersworld',
      name: task_name,
      authorization: [{
        actor: wax.userAccount,
        permission: 'active',
      }],
      data: {
        owner: wax.userAccount,
        asset_id: asset_id
      },
    }])
  },
  repair: async function(asset_id) {
    sign([{
      account: 'farmersworld',
      name: 'repair',
      authorization: [{
        actor: wax.userAccount,
        permission: 'active',
      }],
      data: {
        asset_owner: wax.userAccount,
        asset_id: asset_id
      },
    }])
  },
  recover: function(energy_recovered) {
    sign([{
      account: 'farmersworld',
      name: 'recover',
      authorization: [{
        actor: wax.userAccount,
        permission: 'active',
      }],
      data: {
        owner: wax.userAccount,
        energy_recovered: energy_recovered
      },
    }])
  }
}
function initSetInterval() {
  farm.getAccounts(1)
  setInterval(() => {
    $('#refreshTime').html('最近执行时间: ' + new Date().toLocaleString())
    farm.toolList = Object.assign([])
    farm.taskList = Object.assign([])
    farm.getAccounts()
    farm.getTools()
    farm.getMbs()
  }, 180000)
}