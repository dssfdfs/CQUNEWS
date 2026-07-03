<template>
  <div class="history-container">
    <el-card>
      <template #header>
        <span>历史任务记录</span>
      </template>
      <el-table :data="tableData" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="createdAt" label="创建时间" width="200" />
        <el-table-column prop="originalContent" label="原始内容" show-overflow-tooltip>
          <template #default="scope">
            {{ scope.row.originalContent.slice(0, 100) }}...
          </template>
        </el-table-column>
        <el-table-column prop="summary" label="摘要" show-overflow-tooltip>
          <template #default="scope">
            {{ scope.row.summary ? scope.row.summary.slice(0, 50) + '...' : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="titles" label="标题数量" width="120">
          <template #default="scope">
            {{ parseTitles(scope.row.titles).length }}个
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'warning'">
              {{ scope.row.status === 1 ? '已完成' : '处理中' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button type="text" @click="viewDetail(scope.row)">查看详情</el-button>
            <el-button type="text" danger @click="handleDelete(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="size"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        style="margin-top: 20px; text-align: right"
      />
    </el-card>

    <el-dialog v-model="dialogVisible" title="任务详情" width="800px">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="原始内容" name="original">
          <p class="detail-content">{{ detailData?.originalContent }}</p>
        </el-tab-pane>
        <el-tab-pane label="生成标题" name="titles">
          <div class="detail-titles">
            <div v-for="(title, index) in detailTitles" :key="index" class="detail-title-item">
              <span class="detail-title-label">{{ titleLabels[index] }}</span>
              <span class="detail-title-text">{{ title }}</span>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="智能摘要" name="summary">
          <p class="detail-content">{{ detailData?.summary }}</p>
        </el-tab-pane>
        <el-tab-pane label="实体抽取" name="entities">
          <div class="detail-entities">
            <el-tag
              v-for="(entity, index) in detailEntities"
              :key="index"
              :type="getEntityType(entity.type)"
            >
              {{ entity.type }}: {{ entity.text }}
            </el-tag>
          </div>
        </el-tab-pane>
        <el-tab-pane label="事实校验" name="factCheck">
          <div v-if="detailFactCheck" class="detail-fact-check">
            <el-tag :type="getRiskType(detailFactCheck.riskLevel)">
              风险等级：{{ detailFactCheck.riskLevel }}
            </el-tag>
            <p>校验结果：{{ detailFactCheck.passed ? '通过' : '未通过' }}</p>
            <p>说明：{{ detailFactCheck.message }}</p>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getHistoryList, deleteHistory, getHistoryById } from '../api/history'

const tableData = ref([])
const page = ref(1)
const size = ref(10)
const total = ref(0)

const dialogVisible = ref(false)
const activeTab = ref('original')
const detailData = ref(null)
const detailTitles = ref([])
const detailEntities = ref([])
const detailFactCheck = ref(null)

const titleLabels = ['描述型', '吸引型', '精简型']

onMounted(() => {
  fetchData()
})

const fetchData = async () => {
  try {
    const res = await getHistoryList({ page: page.value, size: size.value })
    tableData.value = res.records
    total.value = res.total
  } catch (error) {
    ElMessage.error(error.message || '获取数据失败')
  }
}

const handleSizeChange = (val) => {
  size.value = val
  fetchData()
}

const handleCurrentChange = (val) => {
  page.value = val
  fetchData()
}

const parseTitles = (titlesStr) => {
  try {
    return JSON.parse(titlesStr) || []
  } catch {
    return []
  }
}

const viewDetail = async (row) => {
  try {
    const res = await getHistoryById(row.id)
    detailData.value = res
    detailTitles.value = parseTitles(res.titles)
    try {
      detailEntities.value = JSON.parse(res.entities) || []
    } catch {
      detailEntities.value = []
    }
    try {
      detailFactCheck.value = JSON.parse(res.factCheckResult) || null
    } catch {
      detailFactCheck.value = null
    }
    dialogVisible.value = true
  } catch (error) {
    ElMessage.error(error.message || '获取详情失败')
  }
}

const handleDelete = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除该记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteHistory(id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const getEntityType = (type) => {
  const types = {
    PER: 'primary',
    ORG: 'success',
    NUM: 'warning'
  }
  return types[type] || 'info'
}

const getRiskType = (level) => {
  const types = {
    '高': 'danger',
    '中': 'warning',
    '低': 'success'
  }
  return types[level] || 'info'
}
</script>

<style scoped>
.history-container {
  padding: 20px;
}

.detail-content {
  white-space: pre-wrap;
  line-height: 1.8;
  color: #333;
}

.detail-titles {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-title-item {
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
}

.detail-title-label {
  display: inline-block;
  font-size: 12px;
  color: #666;
  margin-right: 10px;
}

.detail-title-text {
  font-weight: bold;
  color: #333;
}

.detail-entities {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.detail-fact-check {
  line-height: 2;
}
</style>
