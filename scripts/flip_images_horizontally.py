import glob

from PIL import Image

image_list = []

for filename in glob.glob('Images/train/no_punch/*.JPG'):
    im = Image.open(filename)
    image_list.append(im)


def flip_image(image, saved_location):
    flipped_image = image.transpose(Image.FLIP_LEFT_RIGHT)
    flipped_image.save(saved_location)


for i in range(len(image_list)):
    image = image_list[i]
    location = i
    saved_location = 'Images/no_punch_cloned/' + str(i) + '.JPG'

    flip_image(image, saved_location)
