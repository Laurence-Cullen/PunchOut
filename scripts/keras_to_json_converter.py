import keras
import tensorflowjs as tfjs
from keras.applications import MobileNetV2
from keras.layers import Dense
from keras.layers import GlobalAveragePooling2D
from keras.models import Model

base_model = MobileNetV2(weights='imagenet', include_top=False)

base_model.summary()

x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(1024, activation='relu')(x)
predictions = Dense(4, activation='softmax')(x)
# this is the model we will train
mobilenetV2_model = Model(inputs=base_model.input, outputs=predictions)
mobilenetV2_model.summary()
mobilenetV2_model.compile(loss='categorical_crossentropy', optimizer=keras.optimizers.Adam(lr=0.0003), metrics=['accuracy'])

mobilenetV2_model.load_weights('usable_models/duck-iteration_98percenttest.hdf5')

s
tfjs.converters.save_keras_model(mobilenetV2_model, 'Javascript_models/temp')