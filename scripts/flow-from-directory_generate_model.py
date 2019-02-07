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

# define function to load train, test, and validation datasets
def load_dataset(path):
    data = load_files(path)
    images = np.array(data['filenames'])
    images_targets = np_utils.to_categorical(np.array(data['target']), 4) # [1,0] is no_punch, [0,1] is right_punch
    return images, images_targets

#load training dataset
train_images, train_targets = load_dataset('../Images/train')
test_images, test_targets = load_dataset('../Images/test')

print('There are %s total training images.\n' % len(train_images))
print('There are %s total testing images.\n' % len(test_images))


train_datagen = ImageDataGenerator(
        rescale=1./255,
        width_shift_range=0.1,
        height_shift_range=0.1,
        zoom_range=0.2,
        validation_split=0.2)

train_generator = train_datagen.flow_from_directory(
        '../Images/train',
        target_size=(224, 224),
        batch_size=20,
        class_mode='categorical',
        subset='training')

validation_generator = train_datagen.flow_from_directory(
        '../Images/train',
        target_size=(224, 224),
        batch_size=20,
        class_mode='categorical',
        subset='validation')

###### Fine tuning MobileNetV2
patience = 10

# create the base pre-trained model
base_model = MobileNetV2(weights='imagenet', include_top=False)

base_model.summary()

x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(1024, activation='relu')(x)
predictions = Dense(4, activation='softmax')(x)

# this is the model we will train
mobilenetV2_model = Model(inputs=base_model.input, outputs=predictions)

# we chose to train the top 2 inception blocks, i.e. we will freeze
# the first 249 layers and unfreeze the rest:
for layer in mobilenetV2_model.layers[:70]:
    layer.trainable = False
for layer in mobilenetV2_model.layers[70:]:
    layer.trainable = True

# compile the model (should be done *after* setting layers to non-trainable)
mobilenetV2_model.compile(loss='categorical_crossentropy', optimizer=keras.optimizers.Adam(lr=0.0003),
                          metrics=['accuracy'])

early_stopping = EarlyStopping(monitor='val_loss', min_delta=0, patience=patience, verbose=0, mode='auto',
                               baseline=None)

checkpointer = ModelCheckpoint(filepath='saved_models/weights.best.MobileNetV2.hdf5',
                               verbose=1, save_best_only=True)

batch_size = 20

mobilenetV2_model.fit_generator(
        train_generator,
        steps_per_epoch=3*(train_generator.samples//batch_size),
        epochs=50,
        callbacks=[checkpointer, early_stopping],
        verbose=2,
        validation_data=validation_generator,
        validation_steps=validation_generator.samples//20,
        class_weight=None)  # Can pay more attention to underrepresented classes

