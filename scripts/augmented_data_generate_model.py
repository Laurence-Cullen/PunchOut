import time

import keras
import numpy as np
from PIL import ImageFile
from keras.applications import MobileNetV2
from keras.callbacks import EarlyStopping
from keras.callbacks import ModelCheckpoint
from keras.layers import Dense
from keras.layers import GlobalAveragePooling2D
from keras.models import Model
from keras.preprocessing import image
from keras.utils import np_utils
from sklearn.datasets import load_files
from sklearn.model_selection import train_test_split
from tqdm import tqdm
from keras.preprocessing.image import ImageDataGenerator

# define function to load train, test, and validation datasets
def load_dataset(path):
    data = load_files(path)
    images = np.array(data['filenames'])
    images_targets = np_utils.to_categorical(np.array(data['target']), 4)  # [1,0] is no_punch, [0,1] is right_punch
    return images, images_targets


# load training dataset
train_images, train_targets = load_dataset('../Images/train')
test_images, test_targets = load_dataset('../Images/test')

print('There are %s total training images.\n' % len(train_images))
print('There are %s total testing images.\n' % len(test_images))


# Create functions to load the images into 4D numpy tensors, load data into tensors and create a training-validation
# split
# out of the training data.


# Functions to load images into 4d Numpy arrays.
def path_to_tensor(img_path):
    # loads RGB image as PIL.Image.Image type
    img = image.load_img(img_path, target_size=(224, 224))
    # convert PIL.Image.Image type to 3D tensor with shape (224, 224, 3)
    x = image.img_to_array(img)
    # convert 3D tensor to 4D tensor with shape (1, 224, 224, 3) and return 4D tensor
    return np.expand_dims(x, axis=0)


def paths_to_tensor(img_paths):
    list_of_tensors = [path_to_tensor(img_path) for img_path in tqdm(img_paths)]
    return np.vstack(list_of_tensors)


ImageFile.LOAD_TRUNCATED_IMAGES = True

# pre-process and load the data for Keras
train_tensors = paths_to_tensor(train_images).astype('float32') / 255
test_tensors = paths_to_tensor(test_images).astype('float32') / 255

# Split the training data into training and validation sets.
train_tensors, valid_tensors, train_targets, valid_targets = train_test_split(train_tensors, train_targets,
                                                                              test_size=0.2,
                                                                              random_state=42)


# Augmented data model generator

def augmented_MobileNetV2_model():
    ###### Fine tuning MobileNetV2
    patience = 10
    batch_size = 20
    epochs = 50


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

    mobilenetV2_model.compile(loss='categorical_crossentropy', optimizer=keras.optimizers.Adam(lr=0.0003),
                              metrics=['accuracy'])


    checkpointer = ModelCheckpoint(filepath='../saved_models/weights.best.MobileNetV2.hdf5',
                                   verbose=1, save_best_only=True)

    early_stopping = EarlyStopping(monitor='val_loss', min_delta=0, patience=patience, verbose=0, mode='auto',
                                   baseline=None)

    # Create and configure augmented image generator

    datagen = ImageDataGenerator(width_shift_range=0.1,  # randomly shift images horizontally (10% of total width)
                                 height_shift_range=0.1,  # randomly shift images vertically (10% of total height)
                                 zoom_range=0.2)  # range for random zoom)

    # fit augmented image generator on data
    datagen.fit(train_tensors)

    # train the model
    mobilenetV2_model.fit_generator(
        datagen.flow(train_tensors, train_targets, batch_size=batch_size),
        steps_per_epoch=3 * (train_tensors.shape[0] // batch_size),
        epochs=epochs,
        verbose=2,
        callbacks=[checkpointer, early_stopping],
        validation_data=(valid_tensors, valid_targets),
        class_weight=None,  # Can pay more attention to underrepresented classes
    )


    # load the weights that generated the best validation accuracy
    mobilenetV2_model.load_weights('../saved_models/weights.best.MobileNetV2.hdf5')

    # get index of predicted action for each image in test set
    action_predictions = [np.argmax(mobilenetV2_model.predict(np.expand_dims(tensor, axis=0))) for tensor in
                          test_tensors]

    # report test accuracy
    test_accuracy = 100 * np.sum(np.array(action_predictions) == np.argmax(test_targets, axis=1)) / len(
        action_predictions)
    print('Test accuracy: %.4f%%' % test_accuracy)

    # Compute average prediction time
    computational_times = []

    for i in range(50):
        start = time.time()
        mobilenetV2_model.predict(np.expand_dims(test_tensors[i], axis=0))
        end = time.time()

        elapsed = end - start
        computational_times.append(elapsed)

    print("Average computational time per prediction: {:.3f} ms".format(
        np.sum(computational_times) / len(computational_times) * 1000))


augmented_MobileNetV2_model()

