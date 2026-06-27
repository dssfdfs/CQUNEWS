import request from './request'

export function processSingle(data) {
  return request({
    url: '/process/single',
    method: 'post',
    data
  })
}
