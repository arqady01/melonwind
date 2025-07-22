// pages/imageUpload/imageUpload.js
Page({
  data: {
    imageList: [], // 存储选择的图片路径
    hasImages: false, // 是否有图片
    isUploading: false, // 是否正在上传
    uploadProgress: [], // 上传进度
    uploadResults: [], // 上传结果
    difyApiUrl: 'https://api.dify.ai/v1/files/upload',
    difyToken: 'app-eInh6Q5ggritq8s7wciHRAKQ'
  },

  onLoad: function (options) {
    // 初始化图片数组
    this.setData({
      imageList: new Array(3).fill('')
    });
  },

  // 选择图片
  selectImage: function (e) {
    const index = e.currentTarget.dataset.index;
    const that = this;
    
    wx.showActionSheet({
      itemList: ['从相册选择', '拍照'],
      success: function (res) {
        let sourceType = [];
        if (res.tapIndex === 0) {
          sourceType = ['album'];
        } else if (res.tapIndex === 1) {
          sourceType = ['camera'];
        }
        
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: sourceType,
          success: function (res) {
            const tempFilePath = res.tempFiles[0].tempFilePath;
            that.updateImageList(index, tempFilePath);
          },
          fail: function (err) {
            console.error('选择图片失败:', err);
            wx.showToast({
              title: '选择图片失败',
              icon: 'error'
            });
          }
        });
      }
    });
  },

  // 删除图片
  deleteImage: function (e) {
    e.stopPropagation(); // 阻止事件冒泡
    const index = e.currentTarget.dataset.index;
    this.updateImageList(index, '');
  },

  // 更新图片列表
  updateImageList: function (index, imagePath) {
    const imageList = [...this.data.imageList];
    imageList[index] = imagePath;
    
    const hasImages = imageList.some(img => img !== '');
    
    this.setData({
      imageList: imageList,
      hasImages: hasImages
    });
  },

  // 开始分析（上传图片到Dify）
  startAnalyze: function () {
    if (!this.data.hasImages || this.data.isUploading) {
      return;
    }

    const validImages = this.data.imageList.filter(img => img !== '');
    
    if (validImages.length === 0) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'error'
      });
      return;
    }

    this.setData({
      isUploading: true,
      uploadProgress: [],
      uploadResults: []
    });

    // 初始化进度显示
    const progressArray = validImages.map((_, index) => ({
      status: '准备上传...',
      progress: 0
    }));
    
    this.setData({
      uploadProgress: progressArray
    });

    // 逐个上传图片
    this.uploadImages(validImages);
  },

  // 上传图片到Dify API
  uploadImages: async function (imageList) {
    const results = [];
    
    for (let i = 0; i < imageList.length; i++) {
      const imagePath = imageList[i];
      
      try {
        // 更新进度状态
        this.updateUploadProgress(i, '上传中...', 50);
        
        const result = await this.uploadSingleImage(imagePath, i + 1);
        results.push({
          success: true,
          id: result.id,
          name: result.name,
          size: result.size,
          extension: result.extension,
          mime_type: result.mime_type
        });
        
        // 更新进度状态
        this.updateUploadProgress(i, '上传成功', 100);
        
      } catch (error) {
        console.error(`图片${i + 1}上传失败:`, error);
        results.push({
          success: false,
          message: error.message || '上传失败'
        });
        
        // 更新进度状态
        this.updateUploadProgress(i, '上传失败', 0);
      }
    }
    
    // 显示最终结果
    this.setData({
      isUploading: false,
      uploadResults: results
    });
    
    // 检查是否有成功上传的图片
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    if (successCount === totalCount) {
      wx.showToast({
        title: `全部上传成功！`,
        icon: 'success'
      });
    } else if (successCount > 0) {
      wx.showToast({
        title: `${successCount}/${totalCount} 上传成功`,
        icon: 'none'
      });
    } else {
      wx.showToast({
        title: '上传失败',
        icon: 'error'
      });
    }
  },

  // 上传单个图片
  uploadSingleImage: function (imagePath, imageIndex) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: this.data.difyApiUrl,
        filePath: imagePath,
        name: 'file',
        formData: {
          'user': '123123'
        },
        header: {
          'Authorization': `Bearer ${this.data.difyToken}`
        },
        success: (res) => {
          console.log(`图片${imageIndex}上传响应:`, res);
          
          if (res.statusCode === 200 || res.statusCode === 201) {
            try {
              const data = JSON.parse(res.data);
              resolve(data);
            } catch (parseError) {
              console.error('解析响应数据失败:', parseError);
              reject(new Error('服务器响应格式错误'));
            }
          } else {
            // 处理错误响应
            try {
              const errorData = JSON.parse(res.data);
              reject(new Error(errorData.message || `HTTP ${res.statusCode}`));
            } catch (parseError) {
              reject(new Error(`上传失败 (HTTP ${res.statusCode})`));
            }
          }
        },
        fail: (error) => {
          console.error(`图片${imageIndex}上传失败:`, error);
          reject(new Error(error.errMsg || '网络请求失败'));
        }
      });
    });
  },

  // 更新上传进度
  updateUploadProgress: function (index, status, progress) {
    const uploadProgress = [...this.data.uploadProgress];
    if (uploadProgress[index]) {
      uploadProgress[index].status = status;
      uploadProgress[index].progress = progress;
      this.setData({
        uploadProgress: uploadProgress
      });
    }
  }
});
