<template>
  <div class="process-container">
    <div class="input-section">
      <el-card>
        <template #header>
          <span>新闻内容输入</span>
        </template>
        <el-textarea
          v-model="content"
          :rows="10"
          placeholder="请输入新闻内容..."
          maxlength="10000"
          show-word-limit
        />
        <div class="summary-type">
          <span>摘要类型：</span>
          <el-radio-group v-model="summaryType">
            <el-radio label="标准">标准摘要</el-radio>
            <el-radio label="简短">简短摘要</el-radio>
            <el-radio label="详细">详细摘要</el-radio>
          </el-radio-group>
        </div>
        <el-button type="primary" @click="handleGenerate" :loading="loading" style="margin-top: 10px">
          智能生成
        </el-button>
      </el-card>
    </div>

    <div v-if="result" class="result-section">
      <el-card class="titles-card">
        <template #header>
          <span>生成标题</span>
        </template>
        <div class="titles-list">
          <div v-for="(title, index) in result.titles" :key="index" class="title-item">
            <span class="title-label">{{ titleLabels[index] }}</span>
            <span class="title-text">{{ title }}</span>
          </div>
        </div>
      </el-card>

      <el-card class="summary-card">
        <template #header>
          <span>智能摘要</span>
        </template>
        <p class="summary-text">{{ result.summary }}</p>
      </el-card>

      <el-card class="entities-card">
        <template #header>
          <span>命名实体抽取</span>
        </template>
        <div class="entities-list">
          <el-tag
            v-for="(entity, index) in result.entities"
            :key="index"
            :type="getEntityType(entity.type)"
          >
            {{ entity.type }}: {{ entity.text }}
          </el-tag>
        </div>
      </el-card>

      <el-card class="fact-check-card">
        <template #header>
          <span>事实一致性校验</span>
        </template>
        <div class="fact-check-content">
          <el-tag :type="getRiskType(result.factCheck.riskLevel)">
            风险等级：{{ result.factCheck.riskLevel }}
          </el-tag>
          <p>校验结果：{{ result.factCheck.passed ? '通过' : '未通过' }}</p>
          <p>说明：{{ result.factCheck.message }}</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { processSingle } from '../api/process'

const content = ref('')
const summaryType = ref('标准')
const loading = ref(false)
const result = ref(null)

const titleLabels = ['描述型', '吸引型', '精简型']

const handleGenerate = async () => {
  if (!content.value.trim()) {
    ElMessage.warning('请输入新闻内容')
    return
  }
  loading.value = true
  try {
    const res = await processSingle({
      content: content.value,
      summaryType: summaryType.value
    })
    result.value = res
    ElMessage.success('生成成功')
  } catch (error) {
    ElMessage.error(error.message || '生成失败')
  } finally {
    loading.value = false
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
.process-container {
  padding: 20px;
  display: grid;
  gap: 20px;
}

.input-section {
  width: 100%;
}

.result-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.summary-type {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.titles-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.title-item {
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
}

.title-label {
  display: inline-block;
  font-size: 12px;
  color: #666;
  margin-right: 10px;
}

.title-text {
  font-weight: bold;
  color: #333;
}

.summary-text {
  line-height: 1.8;
  color: #333;
}

.entities-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.fact-check-content {
  line-height: 2;
}
</style>
