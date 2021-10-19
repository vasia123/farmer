/* author: er567 */
const wax = new waxjs.WaxJS({
  rpcEndpoint: 'https://api.waxsweden.org',
  tryAutoLogin: false,
  freeBandwidth: true,
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
    } else {
      login()
    }
}

async function login() {
  try {
    //if autologged in, this simply returns the userAccount w/no popup
    let userAccount = await wax.login();
    let pubKeys = wax.pubKeys;
    let str = 'Account: ' + userAccount
    $('#loginresponse').html(str);
    console.log('Вход выполнен успешно')
    initSetInterval()
  } catch (e) {
    $('#loginresponse').html(e.message);
  }
}

async function sign(actions) {
  const _this = this
  if(!wax.api) {
    return alert('Пожалуйста, войдите сначала')
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
    $('#loginresponse').html(e.message);
    if (farm.taskList.length) {
      farm.reqTask()
    }
  }
}

async function first_sign() {
  if(!wax.api) {
    return alert('Пожалуйста, войдите сначала')
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
    $('#loginresponse').html(e.message);
  }
}

const farm = {
  toolList: [],
  buildinglList: [],
  taskList: [],
  energy: 0,
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
          // Долговечность восстановления
          if (v.current_durability < 20) {
            console.warn(v.asset_id, 'Можно отремонтировать')
            // _this.repair(v.asset_id)
            _this.taskList.push({
              type: 'repair',
              asset_id: v.asset_id
            })
          }
          // mine
          if (now >= v.next_availability) {
            console.warn(v.asset_id, 'Может майнить')
            // _this.mine(v.asset_id)
            if(_this.energy<45){
              _this.recover(45)
            } else {
              _this.taskList.push({
                type: 'claim',
                asset_id: v.asset_id
              })
            }
          }

        })
        if (_this.taskList.length) {
          $('#jobs').html(JSON.stringify(_this.taskList))
          _this.reqTask()
        } else {
          $('#jobs').html('Нет задач')
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
            console.warn(v.asset_id, 'Может майнить')
            _this.taskList.push({
              type: 'mbsclaim',
              asset_id: v.asset_id,
            })
          }
        })
        if (_this.taskList.length) {
          // $('#jobs').html(JSON.stringify(_this.taskList))
          _this.reqTask()
        } else {
          $('#jobs').html('Нет задачи')
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
          _this.energy = res.rows[0].energy
          $('#energy').html('Текущая энергия：' +JSON.stringify(res.rows[0].energy))
          $('#max').html('Максимальная энергия：' +JSON.stringify(res.rows[0].max_energy))
        }
      }
    })
  },
  getBldsClaim: function () {
    const _this = this
    $.ajax({
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      type: 'POST',
      url: 'https://api.wax.alohaeos.com/v1/chain/get_table_rows',
      data: JSON.stringify({
        "json": true,
        "code": "farmersworld",
        "scope": "farmersworld",
        "table": "buildings",
        "lower_bound": wax.userAccount,
        "upper_bound": wax.userAccount,
        "index_position": 2,
        "key_type": "i64",
        "limit": "100",
        "reverse": false,
        "show_payer": false
      }),
      success: function (res) {
        // TODO: stake asset_id
        _this.buildinglList = [...res.rows]
        $('#buildings').html(JSON.stringify(_this.buildinglList))
        const now = parseInt(new Date().getTime() / 1000)
        _this.buildinglList.map(async (v) => {
          // mine
          if (!v.is_ready) {
            if (now >= v.next_availability) {
              console.warn(v.asset_id, 'Может строиться')

              if(_this.energy<45){
                _this.recover(45)
              } else {
                _this.taskList.push({
                  type: 'bldclaim',
                  asset_id: v.asset_id,
                })
              }
            }
          } else {
            if (v.slots_used > 0) {
              farm.getCrops()
            }
          }
        })
        if (_this.taskList.length) {
          // $('#jobs').html(JSON.stringify(_this.taskList))
          _this.reqTask()
        } else {
          $('#jobs').html('Нет задачи')
        }
      }
    })
  },
  getCrops: function () {
    const _this = this
    $.ajax({
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      type: 'POST',
      url: 'https://api.wax.alohaeos.com/v1/chain/get_table_rows',
      data: JSON.stringify({
        "json": true,
        "code": "farmersworld",
        "scope": "farmersworld",
        "table": "crops",
        "lower_bound": wax.userAccount,
        "upper_bound": wax.userAccount,
        "index_position": 2,
        "key_type": "i64",
        "limit": "100",
        "reverse": false,
        "show_payer": false
      }),
      success: function (res) {
        // TODO: stake asset_id
        var cropslList = [...res.rows]
        $('#crops').html(JSON.stringify(cropslList))
        const now = parseInt(new Date().getTime() / 1000)
        cropslList.map(async (v) => {
          // mine
          if (now >= v.next_availability) {
            console.warn(v.asset_id, 'Может поливаться')
            if(_this.energy<45){
              _this.recover(45)
            } else {
              _this.taskList.push({
                type: 'cropclaim',
                asset_id: v.asset_id,
              })
            }
          }
        })
        if (_this.taskList.length) {
          // $('#jobs').html(JSON.stringify(_this.taskList))
          _this.reqTask()
        } else {
          $('#jobs').html('Нет задачи')
        }
      }
    })
  },
  reqTask: function() {
    while(this.taskList.length > 0) {
      const task = this.taskList[0]
      console.log('task.type', task.type, task.asset_id)
      if (typeof this[task.type] !== "undefined") {
        this[task.type](task.asset_id)
      } else {
        this.mine(task.asset_id, task.type)
      }
      this.taskList.shift()
    }
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
  claim: async function(asset_id) {
    sign([{
      account: 'farmersworld',
      name: 'claim',
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
  bldclaim: async function(asset_id) {
    sign([{
      account: 'farmersworld',
      name: 'bldclaim',
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
  cropclaim: async function(asset_id) {
    var transaction = [{
      account: 'farmersworld',
      name: 'cropclaim',
      authorization: [{
        actor: wax.userAccount,
        permission: 'active',
      }],
      data: {
        owner: wax.userAccount,
        crop_id: asset_id
      },
    }]
    console.log('transaction', transaction)
    sign(transaction)
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
function run_task() {
  $('#refreshTime').html('Время последнего выполнения: ' + new Date().toLocaleString())
  farm.toolList = Object.assign([])
  farm.taskList = Object.assign([])
  farm.getAccounts()
  farm.getTools()
  farm.getMbs()
  farm.getBldsClaim()
}

function initSetInterval() {
  // farm.getAccounts(1)
  run_task()
  setInterval(() => {
    run_task()
  }, 1*60*1000)
  // Автоматически обновлять страницу через 10 минут
  setTimeout(() => {
    window.location.reload()
  }, 10*60*1000)
}
