import request from './request'

export function getHistoryList(params) {
  return request({
    url: '/history/list',
    method: 'get',
    params
  })
}

export function getHistoryById(id) {
  return request({
    url: `/history/${id}`,
    method: 'get'
  })
}

export function deleteHistory(id) {
  return request({
    url: `/history/${id}`,
    method: 'delete'
  })
}
