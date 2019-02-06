from sklearn.datasets import load_files
from keras.utils import np_utils
import numpy as np
from glob import glob
from keras.preprocessing import image
from tqdm import tqdm
from PIL import ImageFile
from sklearn.model_selection import train_test_split
from keras.layers import Conv2D, MaxPooling2D, GlobalAveragePooling2D
from keras.layers import Dropout, Flatten, Dense
from keras.models import Sequential
from keras.callbacks import ModelCheckpoint
from keras.callbacks import EarlyStopping
from keras import optimizers
from keras.layers import BatchNormalization
from keras.regularizers import l1, l2
from keras.layers import GaussianNoise
from sklearn.model_selection import train_test_split
from keras.preprocessing.image import ImageDataGenerator
from keras.applications.resnet50 import ResNet50
from keras.applications.resnet50 import preprocess_input
import keras
from keras.models import Model
from keras.applications import MobileNet
from keras.applications import MobileNetV2
import time

base_model = MobileNetV2(weights='imagenet', include_top=False)

base_model.summary()


x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(1024, activation='relu')(x)
predictions = Dense(3, activation='softmax')(x)
# this is the model we will train
mobilenetV2_model = Model(inputs=base_model.input, outputs=predictions)
mobilenetV2_model.summary()
mobilenetV2_model.compile(loss='categorical_crossentropy', optimizer=keras.optimizers.Adam(lr=0.0003), metrics=['accuracy'])

mobilenetV2_model.load_weights('usable_models/duck-iteration_98percenttest.hdf5')

# Python

import tensorflowjs as tfjs

tfjs.converters.save_keras_model(mobilenetV2_model_duck-iteration_98percenttest, 'Javascript_models')